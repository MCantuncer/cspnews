/**
 * Plays exact slices of a 30-second preview, down to 0.1 s (docs/song-game.md, "Clips").
 *
 * The preview is fetched and decoded once with Web Audio, so a clip starts and stops on the
 * sample: `AudioBufferSourceNode.start(when, offset, duration)` is exact, where an <audio>
 * element paused by a timer drifts by tens of milliseconds, which is most of a 0.1 s clip. Short
 * fades (4 ms) keep the cut from clicking. If the preview cannot be read by script (no CORS), it
 * falls back to an <audio> element stopped by watching its clock on every frame.
 */

export interface Clip {
  /** Plays `seconds` from `from` (seconds into the preview). `onTick` gets 0..1 while it plays. */
  play(from: number, seconds: number, onTick: (done: number) => void, onEnd: () => void): void;
  stop(): void;
  readonly ready: Promise<void>;
}

const FADE = 0.004;

type AudioContextClass = typeof AudioContext;

function audioContextClass(): AudioContextClass | undefined {
  const scope = window as unknown as {
    AudioContext?: AudioContextClass;
    webkitAudioContext?: AudioContextClass;
  };
  return scope.AudioContext ?? scope.webkitAudioContext;
}

let sharedContext: AudioContext | undefined;
function context(): AudioContext | undefined {
  const Context = audioContextClass();
  if (!Context) return undefined;
  sharedContext ??= new Context();
  return sharedContext;
}

/** A clip player for one preview. Decoding starts at once; `ready` settles when it can play. */
export function loadClip(url: string): Clip {
  let buffer: AudioBuffer | undefined;
  let element: HTMLAudioElement | undefined;
  let stopCurrent: (() => void) | undefined;

  const ready = (async () => {
    const ctx = context();
    if (ctx) {
      try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error(String(response.status));
        const data = await response.arrayBuffer();
        buffer = await new Promise<AudioBuffer>((done, fail) => {
          // The callback form, for older Safari, which returns no promise.
          const pending = ctx.decodeAudioData(data, done, fail) as Promise<AudioBuffer> | undefined;
          pending?.catch(fail);
        });
        return;
      } catch {
        // Fall through to the element.
      }
    }
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
    element = audio;
    await new Promise<void>((done, fail) => {
      if (audio.readyState >= 3) {
        done();
        return;
      }
      audio.addEventListener(
        'canplay',
        () => {
          done();
        },
        { once: true },
      );
      audio.addEventListener(
        'error',
        () => {
          fail(new Error('preview did not load'));
        },
        { once: true },
      );
      audio.load();
    });
  })();

  function playBuffer(
    ctx: AudioContext,
    audio: AudioBuffer,
    from: number,
    seconds: number,
    onTick: (done: number) => void,
    onEnd: () => void,
  ): void {
    const length = Math.max(0.02, Math.min(seconds, audio.duration - from));
    const source = ctx.createBufferSource();
    source.buffer = audio;
    const gain = ctx.createGain();
    source.connect(gain).connect(ctx.destination);
    const at = ctx.currentTime + 0.02;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(1, at + FADE);
    gain.gain.setValueAtTime(1, at + length - FADE);
    gain.gain.linearRampToValueAtTime(0, at + length);
    source.start(at, from, length);
    let frame = 0;
    let over = false;
    const tick = () => {
      onTick(Math.min(1, Math.max(0, (ctx.currentTime - at) / length)));
      if (!over) frame = requestAnimationFrame(tick);
    };
    const finish = () => {
      if (over) return;
      over = true;
      cancelAnimationFrame(frame);
      stopCurrent = undefined;
      onTick(1);
      onEnd();
    };
    source.onended = finish;
    stopCurrent = () => {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
      finish();
    };
    frame = requestAnimationFrame(tick);
  }

  function playElement(
    audio: HTMLAudioElement,
    from: number,
    seconds: number,
    onTick: (done: number) => void,
    onEnd: () => void,
  ): void {
    let frame = 0;
    let over = false;
    let startedAt = 0;
    const finish = () => {
      if (over) return;
      over = true;
      audio.pause();
      cancelAnimationFrame(frame);
      stopCurrent = undefined;
      onTick(1);
      onEnd();
    };
    const tick = () => {
      // The element's clock moves in steps on some browsers; the wall clock keeps short clips short.
      const byClock = audio.currentTime - from;
      const byWall = startedAt ? (performance.now() - startedAt) / 1000 : 0;
      const heard = Math.max(byClock, byWall);
      onTick(Math.min(1, heard / seconds));
      if (heard >= seconds) finish();
      else frame = requestAnimationFrame(tick);
    };
    audio.currentTime = from;
    audio.addEventListener('playing', () => (startedAt = performance.now()), { once: true });
    stopCurrent = finish;
    audio.play().then(() => (frame = requestAnimationFrame(tick)), finish);
  }

  return {
    ready,
    play(from, seconds, onTick, onEnd) {
      stopCurrent?.();
      const ctx = sharedContext;
      if (buffer && ctx) {
        // Resuming must happen inside the tap, or mobile browsers keep the sound off.
        void ctx.resume();
        playBuffer(ctx, buffer, from, seconds, onTick, onEnd);
      } else if (element) {
        playElement(element, from, seconds, onTick, onEnd);
      } else {
        onEnd();
      }
    },
    stop() {
      stopCurrent?.();
    },
  };
}
