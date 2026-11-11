/**
 * The account screens in the browser: the header's account corner, the sign-in sheet, the avatar
 * sheet (first sign-in and editing), and the account page. Markup lives in
 * components/account/*.astro; this file only fills it in and answers taps.
 */
import { avatarSvg } from '@cspnews/accounts/avatar';
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

import {
  AccountError,
  accountApi,
  avatarChoices,
  avatarOf,
  googleSignInUrl,
  hasSignInHint,
  readSavedProfile,
  saveProfile,
  signInOutcome,
  withoutSignInOutcome,
} from './account';
import type { PasskeyInfo, Profile } from './account';
import { accountWords } from './account-words';
import type { AccountWords } from './account-words';

type Lang = 'en' | 'tr';

/** Sent on the document when the page finds the reader signed in. */
export const SIGNED_IN_EVENT = 'cspnews:signed-in';

/** How many other avatars the avatar sheet offers at a time. */
const CHOICES = 5;

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function avatarHtml(code: string, size: number, name: string | null, lang: Lang, id: string) {
  return avatarSvg(avatarOf(code), { size, name, lang, idSuffix: id });
}

function returnPath(): string {
  return withoutSignInOutcome(window.location.href);
}

export function startAccount(slot: HTMLElement): void {
  const apiUrl = slot.dataset.api;
  if (!apiUrl) return;
  const base: string = apiUrl;
  const lang: Lang = slot.dataset.lang === 'tr' ? 'tr' : 'en';
  const words = accountWords(lang);
  const api = accountApi(base);
  const root = document.documentElement;
  const page = document.querySelector<HTMLElement>('[data-account-page]');

  const dialog = slot.querySelector<HTMLDialogElement>('[data-account-dialog]');
  const signinView = slot.querySelector<HTMLElement>('[data-view="signin"]');
  const avatarView = slot.querySelector<HTMLElement>('[data-view="avatar"]');
  if (!dialog || !signinView || !avatarView) return;

  let profile: Profile | undefined;
  let passkeys: PasskeyInfo[] | undefined;
  // Whether the account page has asked for this account's passkeys yet.
  let passkeysAsked = false;

  // ---- Profile ----------------------------------------------------------------------------

  function setSignedIn(signedIn: boolean) {
    if (signedIn) root.dataset.signedIn = '';
    else delete root.dataset.signedIn;
  }

  function showProfile(next: Profile | undefined) {
    const signedInNow = next !== undefined && profile === undefined;
    profile = next;
    // Lets other parts of the page (the word game) bring in the account's data.
    if (signedInNow) document.dispatchEvent(new CustomEvent(SIGNED_IN_EVENT));
    saveProfile(storage(), next ?? null, Date.now());
    setSignedIn(next !== undefined);
    const spot = slot.querySelector<HTMLElement>('[data-account-avatar]');
    if (spot) spot.innerHTML = next ? avatarHtml(next.avatar, 32, next.name, lang, 'hdr') : '';
    if (page) {
      renderPage();
      if (!next) passkeysAsked = false;
      else if (!passkeysAsked) {
        passkeysAsked = true;
        void loadPasskeys();
      }
    }
  }

  async function loadProfile(fresh: boolean): Promise<Profile | undefined> {
    if (!hasSignInHint(document.cookie)) {
      showProfile(undefined);
      return undefined;
    }
    const saved = fresh ? undefined : readSavedProfile(storage(), Date.now());
    if (saved) {
      showProfile(saved);
      return saved;
    }
    try {
      const me = await api.me();
      showProfile(me);
      return me;
    } catch (error) {
      if (error instanceof AccountError && error.status === 401) {
        showProfile(undefined);
        return undefined;
      }
      throw error;
    }
  }

  // ---- The sheet ----------------------------------------------------------------------------

  function show(view: 'signin' | 'avatar') {
    signinView?.toggleAttribute('hidden', view !== 'signin');
    avatarView?.toggleAttribute('hidden', view !== 'avatar');
    if (!dialog?.open) dialog?.showModal();
    dialog?.querySelector<HTMLElement>('.acc-sheet')?.focus();
  }

  dialog.addEventListener('click', (event) => {
    // A tap on the dimmed area outside the sheet closes it.
    if (event.target === dialog) dialog.close();
  });

  function note(target: HTMLElement | null | undefined, text: string) {
    if (target) target.textContent = text;
  }

  // The sign-in view: a few avatars on the hour line, the two ways in.
  function openSignIn(message = '') {
    const line = signinView?.querySelector<HTMLElement>('[data-line]');
    if (line) {
      const codes = avatarChoices('', 5, Math.random);
      line.innerHTML = codes
        .map(
          (code, i) =>
            `<span class="acc-line-stop${i === 2 ? ' acc-line-main' : ''}">${avatarHtml(code, i === 2 ? 44 : 32, null, lang, `line${String(i)}`)}</span>`,
        )
        .join('');
    }
    const google = signinView?.querySelector<HTMLAnchorElement>('[data-google]');
    if (google) google.href = googleSignInUrl(base, returnPath());
    signinView?.querySelector('[data-create]')?.setAttribute('hidden', '');
    note(signinView?.querySelector('[data-note]'), message);
    show('signin');
  }

  slot.querySelector('[data-account-signin]')?.addEventListener('click', () => {
    openSignIn();
  });

  async function busy<T>(button: HTMLButtonElement | null, work: () => Promise<T>) {
    const label = button?.querySelector('[data-label]');
    const before = label?.textContent ?? '';
    if (button) button.disabled = true;
    if (label) label.textContent = words.working;
    try {
      return await work();
    } finally {
      if (button) button.disabled = false;
      if (label) label.textContent = before;
    }
  }

  function passkeyMessage(error: unknown): string {
    if (error instanceof AccountError) return error.message;
    // The device already holds a passkey for this account.
    if (error instanceof Error && error.name === 'InvalidStateError') return words.passkeyExists;
    return words.passkeyFailed;
  }

  const cancelled = (error: unknown) =>
    error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'AbortError');

  const loginButton = signinView.querySelector<HTMLButtonElement>('[data-passkey-login]');
  loginButton?.addEventListener('click', () => {
    const noteEl = signinView.querySelector<HTMLElement>('[data-note]');
    note(noteEl, '');
    if (!browserSupportsWebAuthn()) {
      note(noteEl, words.passkeyUnsupported);
      return;
    }
    void busy(loginButton, async () => {
      try {
        const options = (await api.loginOptions()) as PublicKeyCredentialRequestOptionsJSON;
        const response = await startAuthentication({ optionsJSON: options });
        await api.loginVerify(response);
        setSignedIn(true);
        await loadProfile(true);
        dialog.close();
      } catch (error) {
        // No passkey here, or the reader closed the prompt: offer to make one.
        signinView.querySelector('[data-create]')?.removeAttribute('hidden');
        if (!cancelled(error)) note(noteEl, passkeyMessage(error));
      }
    });
  });

  /** Makes a passkey: a new account when signed out, or one more passkey for this account. */
  async function createPasskey(): Promise<'welcome' | 'added'> {
    const options = (await api.registerOptions()) as PublicKeyCredentialCreationOptionsJSON;
    const response = await startRegistration({ optionsJSON: options });
    return (await api.registerVerify(response)).result;
  }

  const createButton = signinView.querySelector<HTMLButtonElement>('[data-passkey-create]');
  createButton?.addEventListener('click', () => {
    const noteEl = signinView.querySelector<HTMLElement>('[data-note]');
    note(noteEl, '');
    if (!browserSupportsWebAuthn()) {
      note(noteEl, words.passkeyUnsupported);
      return;
    }
    void busy(createButton, async () => {
      try {
        await createPasskey();
        setSignedIn(true);
        const me = await loadProfile(true);
        if (me) openAvatar('welcome', 'passkey');
        else dialog.close();
      } catch (error) {
        if (!cancelled(error)) note(noteEl, passkeyMessage(error));
      }
    });
  });

  // ---- The avatar sheet ---------------------------------------------------------------------

  let chosen = '';
  let original = '';
  let choices: string[] = [];
  const nameInput = avatarView.querySelector<HTMLInputElement>('[data-name]');

  function typedName(): string | null {
    const value = nameInput?.value.trim() ?? '';
    return value === '' ? null : value;
  }

  function renderAvatarSheet() {
    const name = typedName();
    const hero = avatarView?.querySelector<HTMLElement>('[data-hero]');
    if (hero) hero.innerHTML = avatarHtml(chosen, 80, name, lang, 'hero');
    const alts = avatarView?.querySelector<HTMLElement>('[data-alts]');
    if (!alts) return;
    const ground = avatarOf(original).ground;
    const initial = name ? [`initial:${ground}`] : [];
    const list = [...new Set([original, ...initial, ...choices])];
    alts.innerHTML = list
      .map((code, i) => {
        const selected = code === chosen;
        const label = code.startsWith('initial:') ? words.useInitial : words.chooseAvatar;
        return `<button type="button" class="acc-alt" role="radio" aria-checked="${String(selected)}" aria-label="${label}" data-code="${code}">${avatarHtml(code, 40, name, lang, `alt${String(i)}`)}</button>`;
      })
      .join('');
  }

  function openAvatar(as: 'welcome' | 'edit', via?: 'google' | 'passkey') {
    if (!profile || !avatarView) return;
    original = profile.avatar;
    chosen = profile.avatar;
    choices = avatarChoices(original, CHOICES, Math.random);
    if (nameInput) nameInput.value = profile.name ?? '';
    const d = avatarView.dataset;
    const ok = avatarView.querySelector<HTMLElement>('[data-ok]');
    ok?.toggleAttribute('hidden', !via);
    note(
      avatarView.querySelector('[data-ok-text]'),
      via === 'google' ? (d.okGoogle ?? '') : (d.okPasskey ?? ''),
    );
    note(
      avatarView.querySelector('[data-avatar-title]'),
      (as === 'welcome' ? d.titleWelcome : d.titleEdit) ?? '',
    );
    avatarView.querySelector('[data-avatar-sub]')?.toggleAttribute('hidden', as !== 'welcome');
    note(
      avatarView.querySelector('[data-avatar-done]'),
      (as === 'welcome' ? d.doneWelcome : d.doneEdit) ?? '',
    );
    note(avatarView.querySelector('[data-avatar-note]'), '');
    renderAvatarSheet();
    show('avatar');
  }

  avatarView.querySelector('[data-alts]')?.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-code]');
    if (!button?.dataset.code) return;
    chosen = button.dataset.code;
    renderAvatarSheet();
    avatarView.querySelector<HTMLElement>(`[data-code="${chosen}"]`)?.focus();
  });

  avatarView.querySelector('[data-shuffle]')?.addEventListener('click', () => {
    choices = avatarChoices(original, CHOICES, Math.random);
    renderAvatarSheet();
  });

  nameInput?.addEventListener('input', () => {
    // Without a name there is no initial to show.
    if (chosen.startsWith('initial:') && !typedName()) chosen = original;
    renderAvatarSheet();
  });

  const doneButton = avatarView.querySelector<HTMLButtonElement>('[data-avatar-done]');
  doneButton?.addEventListener('click', () => {
    if (!profile) return;
    const name = typedName();
    const patch: { name?: string | null; avatar?: string } = {};
    if (name !== profile.name) patch.name = name;
    if (chosen !== profile.avatar) patch.avatar = chosen;
    if (Object.keys(patch).length === 0) {
      dialog.close();
      return;
    }
    doneButton.disabled = true;
    api
      .update(patch)
      .then((next) => {
        showProfile(next);
        dialog.close();
      })
      .catch((error: unknown) => {
        note(
          avatarView.querySelector('[data-avatar-note]'),
          error instanceof AccountError && error.status === 400 ? error.message : words.saveFailed,
        );
      })
      .finally(() => {
        doneButton.disabled = false;
      });
  });

  // ---- The account page ---------------------------------------------------------------------

  function pageState(state: 'loading' | 'signed-out' | 'error' | 'account') {
    for (const el of page?.querySelectorAll<HTMLElement>('[data-state]') ?? []) {
      el.hidden = el.dataset.state !== state;
    }
  }

  function renderPage() {
    if (!page) return;
    if (!profile) {
      pageState('signed-out');
      return;
    }
    pageState('account');
    const avatar = page.querySelector<HTMLElement>('[data-me-avatar]');
    if (avatar) avatar.innerHTML = avatarHtml(profile.avatar, 64, profile.name, lang, 'page');
    note(page.querySelector('[data-me-name]'), profile.name ?? words.noName);
    const google = profile.signInMethods.includes('google');
    page.querySelector('[data-google-connected]')?.toggleAttribute('hidden', !google);
    const connect = page.querySelector<HTMLAnchorElement>('[data-google-connect]');
    if (connect) {
      connect.hidden = google;
      connect.href = googleSignInUrl(base, returnPath());
    }
    renderPasskeys(page, words, lang);
  }

  function renderPasskeys(container: HTMLElement, w: AccountWords, language: Lang) {
    const list = container.querySelector<HTMLElement>('[data-passkeys]');
    if (!list) return;
    const date = new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    list.innerHTML = (passkeys ?? [])
      .map((p, i) => {
        const added = w.passkeyAdded(date.format(new Date(p.createdAt)));
        const synced = p.backedUp ? ` · ${w.syncedPasskey}` : '';
        return (
          `<li class="acc-row">` +
          `<svg class="acc-row-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="12" r="4"/><path d="M12 12h9.5M18.5 12v3M15.5 12v2"/></svg>` +
          `<span class="acc-row-name">${w.passkeyName(i + 1)}<small>${added}${synced}</small></span>` +
          `<button type="button" class="acc-row-action" data-remove="${encodeURIComponent(p.id)}">${w.remove}</button>` +
          `</li>`
        );
      })
      .join('');
  }

  async function loadPasskeys() {
    if (!page || !profile) return;
    try {
      passkeys = await api.passkeys();
    } catch {
      passkeys = [];
    }
    renderPasskeys(page, words, lang);
  }

  async function startPage(fresh: boolean) {
    if (!page) return;
    pageState('loading');
    try {
      await loadProfile(fresh);
    } catch {
      pageState('error');
    }
  }

  if (page) {
    const pageNote = page.querySelector<HTMLElement>('[data-page-note]');
    page.querySelector('[data-retry]')?.addEventListener('click', () => void startPage(true));
    page.querySelector('[data-open-signin]')?.addEventListener('click', () => {
      openSignIn();
    });
    page.querySelector('[data-edit]')?.addEventListener('click', () => {
      openAvatar('edit');
    });

    const addButton = page.querySelector<HTMLButtonElement>('[data-add-passkey]');
    addButton?.addEventListener('click', () => {
      note(pageNote, '');
      if (!browserSupportsWebAuthn()) {
        note(pageNote, words.passkeyUnsupported);
        return;
      }
      addButton.disabled = true;
      createPasskey()
        .then(() => loadProfile(true))
        .then(() => loadPasskeys())
        .catch((error: unknown) => {
          if (!cancelled(error)) note(pageNote, passkeyMessage(error));
        })
        .finally(() => {
          addButton.disabled = false;
        });
    });

    page.querySelector('[data-passkeys]')?.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-remove]');
      const id = button?.dataset.remove;
      if (!button || !id) return;
      note(pageNote, '');
      button.disabled = true;
      api
        .removePasskey(decodeURIComponent(id))
        .then(() => loadProfile(true))
        .then(() => loadPasskeys())
        .catch((error: unknown) => {
          button.disabled = false;
          note(pageNote, error instanceof AccountError ? error.message : words.saveFailed);
        });
    });

    page.querySelector('[data-download]')?.addEventListener('click', () => {
      note(pageNote, '');
      api
        .exportData()
        .then((data) => {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'cspnews-account.json';
          link.click();
          window.setTimeout(() => {
            URL.revokeObjectURL(link.href);
          }, 1000);
        })
        .catch(() => {
          note(pageNote, words.loadFailed);
        });
    });

    page.querySelector('[data-signout]')?.addEventListener('click', () => {
      api
        .signOut()
        .catch(() => undefined)
        .finally(() => {
          passkeys = undefined;
          showProfile(undefined);
        });
    });

    const confirmBox = page.querySelector<HTMLElement>('[data-delete-confirm]');
    page.querySelector('[data-delete]')?.addEventListener('click', () => {
      if (confirmBox) confirmBox.hidden = false;
      confirmBox?.querySelector<HTMLElement>('[data-delete-cancel]')?.focus();
    });
    page.querySelector('[data-delete-cancel]')?.addEventListener('click', () => {
      if (confirmBox) confirmBox.hidden = true;
    });
    page.querySelector('[data-delete-yes]')?.addEventListener('click', () => {
      api
        .deleteAccount()
        .then(() => {
          if (confirmBox) confirmBox.hidden = true;
          passkeys = undefined;
          showProfile(undefined);
        })
        .catch(() => {
          note(pageNote, words.saveFailed);
        });
    });
  }

  // ---- Start --------------------------------------------------------------------------------

  const outcome = signInOutcome(window.location.search);
  if (outcome) window.history.replaceState(window.history.state, '', returnPath());

  const ready = page
    ? startPage(outcome !== undefined)
    : loadProfile(outcome !== undefined).catch(() => undefined);
  void ready.then(() => {
    if (outcome === 'welcome' && profile) openAvatar('welcome', 'google');
    else if (outcome === 'in-use' || outcome === 'failed') openSignIn(words.outcome[outcome]);
    else if (outcome === 'linked' || outcome === 'cancelled') {
      const pageNote = page?.querySelector<HTMLElement>('[data-page-note]');
      if (pageNote) note(pageNote, words.outcome[outcome]);
    }
  });
}
