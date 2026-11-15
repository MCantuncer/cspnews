/**
 * What the Tonight list watches (docs/design/decisions/tonight.md). Rules read these schedules
 * before each bulletin and keep every match that one of these teams plays in the window.
 *
 * Team names are matched as the source writes them, ignoring case and Turkish letters. When a
 * player moves club, change their line here; the Turks abroad list (abroad.ts) stays the same.
 * Club lines were last checked on 2026-11-15.
 */

export interface Bilingual {
  readonly en: string;
  readonly tr: string;
}

/** A league on ESPN's public scoreboard: `<sport>/<league>`, as in its addresses. */
export interface EspnLeague {
  readonly path: string;
  readonly sport: 'football' | 'basketball';
  readonly competition: Bilingual;
}

/** A club a person on the Turks abroad list plays for, and the leagues it plays in. */
export interface PersonClub {
  readonly personId: string;
  readonly team: readonly string[];
  readonly leagues: readonly string[];
}

const nba: EspnLeague = {
  path: 'basketball/nba',
  sport: 'basketball',
  competition: { en: 'NBA', tr: 'NBA' },
};
const championsLeague: EspnLeague = {
  path: 'soccer/uefa.champions',
  sport: 'football',
  competition: { en: 'Champions League', tr: 'Şampiyonlar Ligi' },
};

export const ESPN_LEAGUES: readonly EspnLeague[] = [
  nba,
  championsLeague,
  {
    path: 'soccer/uefa.nations',
    sport: 'football',
    competition: { en: 'Nations League', tr: 'Uluslar Ligi' },
  },
  {
    path: 'soccer/fifa.worldq.uefa',
    sport: 'football',
    competition: { en: 'World Cup qualifier', tr: 'Dünya Kupası elemesi' },
  },
  {
    path: 'soccer/uefa.euroq',
    sport: 'football',
    competition: { en: 'Euro qualifier', tr: 'Avrupa Şampiyonası elemesi' },
  },
  {
    path: 'soccer/fifa.friendly',
    sport: 'football',
    competition: { en: 'Friendly', tr: 'Hazırlık maçı' },
  },
  // Read for the Today line's match only: Süper Lig clubs are not Tonight rows.
  {
    path: 'soccer/tur.1',
    sport: 'football',
    competition: { en: 'Süper Lig', tr: 'Süper Lig' },
  },
  { path: 'soccer/esp.1', sport: 'football', competition: { en: 'LaLiga', tr: 'LaLiga' } },
  { path: 'soccer/ita.1', sport: 'football', competition: { en: 'Serie A', tr: 'Serie A' } },
  {
    path: 'soccer/eng.1',
    sport: 'football',
    competition: { en: 'Premier League', tr: 'Premier Lig' },
  },
  {
    path: 'soccer/ger.1',
    sport: 'football',
    competition: { en: 'Bundesliga', tr: 'Bundesliga' },
  },
];

/** The senior men's national team, as the sources name it. Youth and women's teams are other names. */
export const NATIONAL_TEAM: readonly string[] = ['Türkiye', 'Turkey'];

/** National team competitions: every other league is read for clubs and people only. */
export const NATIONAL_LEAGUES: readonly string[] = [
  'soccer/uefa.nations',
  'soccer/fifa.worldq.uefa',
  'soccer/uefa.euroq',
  'soccer/fifa.friendly',
];

/** Turkish clubs, for the European competitions. */
export const TURKISH_CLUBS: readonly string[] = [
  'Galatasaray',
  'Fenerbahçe',
  'Beşiktaş',
  'Trabzonspor',
  'İstanbul Başakşehir',
  'Başakşehir',
  'Samsunspor',
  'Göztepe',
];

/** Leagues where a Turkish club's match is a row of its own (the rest only count for people). */
export const CLUB_LEAGUES: readonly string[] = [championsLeague.path];

export const PERSON_CLUBS: readonly PersonClub[] = [
  { personId: 'alperen-sengun', team: ['Houston Rockets'], leagues: [nba.path] },
  { personId: 'adem-bona', team: ['Philadelphia 76ers'], leagues: [nba.path] },
  {
    personId: 'arda-guler',
    team: ['Real Madrid'],
    leagues: ['soccer/esp.1', championsLeague.path],
  },
  {
    personId: 'kenan-yildiz',
    team: ['Juventus'],
    leagues: ['soccer/ita.1', championsLeague.path],
  },
  {
    personId: 'hakan-calhanoglu',
    team: ['Internazionale', 'Inter Milan', 'Inter'],
    leagues: ['soccer/ita.1', championsLeague.path],
  },
  {
    personId: 'ferdi-kadioglu',
    team: ['Brighton & Hove Albion', 'Brighton'],
    leagues: ['soccer/eng.1'],
  },
  {
    personId: 'can-uzun',
    team: ['Eintracht Frankfurt'],
    leagues: ['soccer/ger.1', championsLeague.path],
  },
  {
    personId: 'altay-bayindir',
    team: ['Manchester United'],
    leagues: ['soccer/eng.1'],
  },
  {
    personId: 'ozan-kabak',
    team: ['TSG Hoffenheim', 'Hoffenheim'],
    leagues: ['soccer/ger.1'],
  },
];

/** A club in the Euroleague, by the code its own data uses. */
export interface EuroleagueClub {
  readonly code: string;
  readonly name: string;
  /** Set when the club is followed for a person on the Turks abroad list, not as a Turkish club. */
  readonly personId?: string;
}

export const EUROLEAGUE_CLUBS: readonly EuroleagueClub[] = [
  { code: 'ULK', name: 'Fenerbahçe Beko' },
  { code: 'IST', name: 'Anadolu Efes' },
  { code: 'PAN', name: 'Panathinaikos', personId: 'cedi-osman' },
];

export const EUROLEAGUE_COMPETITION: Bilingual = { en: 'Euroleague', tr: 'EuroLeague' };
