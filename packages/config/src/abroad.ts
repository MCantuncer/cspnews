import { definePeople } from '@cspnews/core';

/**
 * Who the Turks abroad desk watches for (docs/design/decisions/turks-abroad.md). Any story from
 * any source that names one of these people, or uses one of the phrases below, goes to the desk so
 * the writer sees it. The list is a starting point, not a gate: the writer checks that the person
 * still plays or works outside Türkiye, and adds anyone outlets clearly cover, above all young
 * talents who are not famous yet.
 *
 * Aliases are other spellings outlets use. A surname alone is an alias only when it is rare
 * enough not to match someone else ("Şengün" yes, "Güler" no).
 */
export const ABROAD_PEOPLE = definePeople([
  // ── Basketball ──
  {
    id: 'alperen-sengun',
    name: 'Alperen Şengün',
    aliases: ['Alperen Sengun', 'Şengün'],
    kind: 'basketball',
  },
  { id: 'adem-bona', name: 'Adem Bona', kind: 'basketball' },
  { id: 'cedi-osman', name: 'Cedi Osman', kind: 'basketball' },
  // ── Football ──
  { id: 'arda-guler', name: 'Arda Güler', aliases: ['Arda Guler'], kind: 'football' },
  { id: 'kenan-yildiz', name: 'Kenan Yıldız', aliases: ['Kenan Yildiz'], kind: 'football' },
  {
    id: 'hakan-calhanoglu',
    name: 'Hakan Çalhanoğlu',
    aliases: ['Hakan Calhanoglu', 'Çalhanoğlu'],
    kind: 'football',
  },
  {
    id: 'ferdi-kadioglu',
    name: 'Ferdi Kadıoğlu',
    aliases: ['Ferdi Kadioglu', 'Kadıoğlu'],
    kind: 'football',
  },
  { id: 'can-uzun', name: 'Can Uzun', kind: 'football' },
  { id: 'zeki-celik', name: 'Zeki Çelik', aliases: ['Zeki Celik'], kind: 'football' },
  {
    id: 'altay-bayindir',
    name: 'Altay Bayındır',
    aliases: ['Altay Bayindir', 'Bayındır'],
    kind: 'football',
  },
  { id: 'merih-demiral', name: 'Merih Demiral', aliases: ['Demiral'], kind: 'football' },
  { id: 'ozan-kabak', name: 'Ozan Kabak', kind: 'football' },
  { id: 'arda-turan', name: 'Arda Turan', kind: 'football' },
  // ── Tennis, volleyball, motorsport ──
  { id: 'zeynep-sonmez', name: 'Zeynep Sönmez', aliases: ['Zeynep Sonmez'], kind: 'tennis' },
  { id: 'ebrar-karakurt', name: 'Ebrar Karakurt', kind: 'volleyball' },
  {
    id: 'toprak-razgatlioglu',
    name: 'Toprak Razgatlıoğlu',
    aliases: ['Toprak Razgatlioglu', 'Razgatlıoğlu'],
    kind: 'motorsport',
  },
  { id: 'can-oncu', name: 'Can Öncü', aliases: ['Can Oncu'], kind: 'motorsport' },
  { id: 'deniz-oncu', name: 'Deniz Öncü', aliases: ['Deniz Oncu'], kind: 'motorsport' },
  // ── Science ──
  { id: 'aziz-sancar', name: 'Aziz Sancar', kind: 'science' },
  { id: 'ugur-sahin', name: 'Uğur Şahin', aliases: ['Ugur Sahin'], kind: 'science' },
  {
    id: 'ozlem-tureci',
    name: 'Özlem Türeci',
    aliases: ['Ozlem Tureci', 'Türeci'],
    kind: 'science',
  },
  {
    id: 'daron-acemoglu',
    name: 'Daron Acemoğlu',
    aliases: ['Daron Acemoglu', 'Acemoğlu'],
    kind: 'science',
  },
  { id: 'erol-gelenbe', name: 'Erol Gelenbe', aliases: ['Gelenbe'], kind: 'science' },
  // ── Arts ──
  { id: 'elif-safak', name: 'Elif Şafak', aliases: ['Elif Shafak', 'Elif Safak'], kind: 'arts' },
  { id: 'fatih-akin', name: 'Fatih Akın', aliases: ['Fatih Akin'], kind: 'arts' },
  {
    id: 'ferzan-ozpetek',
    name: 'Ferzan Özpetek',
    aliases: ['Ferzan Ozpetek', 'Özpetek'],
    kind: 'arts',
  },
  { id: 'refik-anadol', name: 'Refik Anadol', kind: 'arts' },
  // ── Business and tech ──
  { id: 'hamdi-ulukaya', name: 'Hamdi Ulukaya', aliases: ['Ulukaya'], kind: 'business' },
  { id: 'hakan-bulgurlu', name: 'Hakan Bulgurlu', aliases: ['Bulgurlu'], kind: 'business' },
]);

/**
 * Phrases that point at a Turkish person abroad who is not on the list: a young researcher's
 * prize, a Turkish-born founder, a talent signing for a club abroad. Matched from the start of a
 * word, with Turkish letters folded.
 */
export const ABROAD_PHRASES = [
  'Türk asıllı',
  'Türk kökenli',
  'Türk bilim insan',
  'Türk bilim kadın',
  'Türk araştırmacı',
  'Türk akademisyen',
  'Türk mühendis',
  'Türk girişimci',
  'Türk yönetmen',
  'Türk sanatçı',
  'Türk öğrenci',
  'genç Türk',
  'gurbetçi',
  'Turkish-born',
  'Turkish-German',
  'Turkish-American',
  'Turkish-British',
  'Turkish scientist',
  'Turkish researcher',
  'Turkish engineer',
  'Turkish founder',
  'Turkish entrepreneur',
  'Turkish director',
  'Turkish artist',
  'Turkish student',
  'Turkish international',
] as const;
