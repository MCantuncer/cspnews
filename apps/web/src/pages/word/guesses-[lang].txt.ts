import type { APIRoute, GetStaticPaths } from 'astro';

import { GAME_LANGUAGES, type GameLanguage } from '@cspnews/wordgame';

import { guessFile } from '../../lib/word-data';

/** `/word/guesses-en.txt` and `/word/guesses-tr.txt`: every accepted guess, fetched by the game. */
export const getStaticPaths = (() =>
  GAME_LANGUAGES.map((lang) => ({ params: { lang } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) =>
  new Response(guessFile(params.lang as GameLanguage), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
