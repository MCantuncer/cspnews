import { spawn } from 'node:child_process';

import type { Translate } from '@cspnews/hotnews';

/**
 * The Hot News translator as a command that reads a JSON list of `{text, from, to}` on stdin
 * and writes the translations as a JSON list of strings (packages/hotnews/translate). The
 * command is split on spaces, never run through a shell.
 */
export function commandTranslator(command: string, timeoutMs = 600_000): Translate {
  const [program, ...args] = command.split(/\s+/).filter(Boolean);
  if (!program) throw new Error('No translator command');
  return (requests) =>
    new Promise((resolve, reject) => {
      const child = spawn(program, args, {
        stdio: ['pipe', 'pipe', 'inherit'],
        timeout: timeoutMs,
      });
      let output = '';
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => (output += chunk));
      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Translator exited with ${String(code)}`));
          return;
        }
        try {
          const parsed: unknown = JSON.parse(output);
          if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
            throw new Error('Translator did not answer with a list of strings');
          }
          resolve(parsed);
        } catch (cause) {
          reject(cause instanceof Error ? cause : new Error(String(cause)));
        }
      });
      child.stdin.end(JSON.stringify(requests));
    });
}
