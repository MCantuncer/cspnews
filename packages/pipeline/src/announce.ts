/**
 * Tells the Telegram channels that a bulletin is out (.github/workflows/announce.yml):
 *
 *   TELEGRAM_BOT_TOKEN=… TELEGRAM_CHAT_ID_TR=… announce <bulletin.json>
 *
 * One message per language that has a chat id (TELEGRAM_CHAT_ID_EN, TELEGRAM_CHAT_ID_TR). It
 * waits until the bulletin's page answers on the site before sending, because the site is
 * deployed a minute or two after the bulletin is merged. Without a token nothing is sent and
 * the run is a success: the announcement is off until the secrets are set.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseBulletin, type Language } from '@cspnews/core';

import { announcement } from './announcement.js';

const file = process.argv[2];
const { TELEGRAM_BOT_TOKEN, SITE_ORIGIN = 'https://www.cspnews.app' } = process.env;
const chats: Record<Language, string | undefined> = {
  en: process.env.TELEGRAM_CHAT_ID_EN,
  tr: process.env.TELEGRAM_CHAT_ID_TR,
};

if (!file) {
  console.error('Usage: announce <bulletin.json>');
  process.exit(2);
}
if (!TELEGRAM_BOT_TOKEN || (!chats.en && !chats.tr)) {
  console.log('Telegram is not set up (no bot token or chat id); nothing sent.');
  process.exit(0);
}

const bulletin = parseBulletin(JSON.parse(readFileSync(resolve(file), 'utf8')));

/** Waits for the page to be live: up to 15 minutes, checking every 20 seconds. */
async function waitForPage(url: string): Promise<boolean> {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    try {
      if ((await fetch(url, { method: 'HEAD' })).ok) return true;
    } catch {
      // Not reachable yet; try again.
    }
    await new Promise((done) => setTimeout(done, 20_000));
  }
  return false;
}

let failed = false;
for (const language of ['tr', 'en'] as const) {
  const chat = chats[language];
  if (!chat) continue;
  const { text, previewUrl } = announcement(bulletin, language, SITE_ORIGIN);
  if (!(await waitForPage(previewUrl))) {
    console.error(`${previewUrl} did not go live in 15 minutes; ${language} not announced.`);
    failed = true;
    continue;
  }
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chat,
      text,
      parse_mode: 'HTML',
      link_preview_options: { url: previewUrl, prefer_large_media: true, show_above_text: true },
    }),
  });
  if (response.ok) console.log(`Announced in ${language}.`);
  else {
    // Never print the request: its address carries the bot token.
    console.error(
      `Telegram refused the ${language} message: ${String(response.status)} ${await response.text()}`,
    );
    failed = true;
  }
}
process.exitCode = failed ? 1 : 0;
