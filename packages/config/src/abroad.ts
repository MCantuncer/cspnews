import { definePeople } from '@cspnews/core';

/**
 * The people the Turks abroad desk watches for (docs/design/decisions/turks-abroad.md). Any
 * story from any source that names one of them goes to the desk, so the writer sees it. The list
 * is a starting point, not a gate: the writer checks that the person is still playing or working
 * outside Türkiye, and may add someone who is not here when outlets clearly cover them.
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
    field: 'sport',
    what: 'basketball',
  },
  { id: 'adem-bona', name: 'Adem Bona', field: 'sport', what: 'basketball' },
  { id: 'cedi-osman', name: 'Cedi Osman', field: 'sport', what: 'basketball' },
  // ── Football ──
  {
    id: 'arda-guler',
    name: 'Arda Güler',
    aliases: ['Arda Guler'],
    field: 'sport',
    what: 'football',
  },
  {
    id: 'kenan-yildiz',
    name: 'Kenan Yıldız',
    aliases: ['Kenan Yildiz'],
    field: 'sport',
    what: 'football',
  },
  {
    id: 'hakan-calhanoglu',
    name: 'Hakan Çalhanoğlu',
    aliases: ['Hakan Calhanoglu', 'Çalhanoğlu'],
    field: 'sport',
    what: 'football',
  },
  {
    id: 'ferdi-kadioglu',
    name: 'Ferdi Kadıoğlu',
    aliases: ['Ferdi Kadioglu', 'Kadıoğlu'],
    field: 'sport',
    what: 'football',
  },
  { id: 'can-uzun', name: 'Can Uzun', field: 'sport', what: 'football' },
  {
    id: 'zeki-celik',
    name: 'Zeki Çelik',
    aliases: ['Zeki Celik'],
    field: 'sport',
    what: 'football',
  },
  {
    id: 'altay-bayindir',
    name: 'Altay Bayındır',
    aliases: ['Altay Bayindir', 'Bayındır'],
    field: 'sport',
    what: 'football',
  },
  {
    id: 'merih-demiral',
    name: 'Merih Demiral',
    aliases: ['Demiral'],
    field: 'sport',
    what: 'football',
  },
  { id: 'ozan-kabak', name: 'Ozan Kabak', field: 'sport', what: 'football' },
  { id: 'arda-turan', name: 'Arda Turan', field: 'sport', what: 'football coach' },
  // ── Tennis, motorsport, volleyball ──
  {
    id: 'zeynep-sonmez',
    name: 'Zeynep Sönmez',
    aliases: ['Zeynep Sonmez'],
    field: 'sport',
    what: 'tennis',
  },
  {
    id: 'toprak-razgatlioglu',
    name: 'Toprak Razgatlıoğlu',
    aliases: ['Toprak Razgatlioglu', 'Razgatlıoğlu'],
    field: 'sport',
    what: 'motorcycle racing',
  },
  {
    id: 'ebrar-karakurt',
    name: 'Ebrar Karakurt',
    field: 'sport',
    what: 'volleyball',
  },
  // ── Beyond sport: only for a big moment ──
  {
    id: 'ugur-sahin',
    name: 'Uğur Şahin',
    aliases: ['Ugur Sahin'],
    field: 'science',
    what: 'medicine',
  },
  {
    id: 'ozlem-tureci',
    name: 'Özlem Türeci',
    aliases: ['Ozlem Tureci', 'Türeci'],
    field: 'science',
    what: 'medicine',
  },
  {
    id: 'daron-acemoglu',
    name: 'Daron Acemoğlu',
    aliases: ['Daron Acemoglu', 'Acemoğlu'],
    field: 'science',
    what: 'economics',
  },
]);
