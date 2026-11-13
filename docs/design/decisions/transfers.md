# Transfers

Football transfers in the Süper Lig and Europe's big leagues (Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, Eredivisie, Primeira Liga), rumours included, followed from first talk to signature. Transfers are a station of their own on the Contents day line, after Around the World and before [And finally](and-finally.md), in pitch green (`--sec-transfers`). The section is there only when a bulletin has moves (`transfers` in the bulletin, at most six: the ones that went forward since the last bulletin).

## The stage line

Every move is at one of four stages (`TRANSFER_STAGES` in `packages/core/src/extras.ts`):

- **Talk** (Söylenti): an outlet links the player with the club.
- **Talks** (Görüşme): the clubs or the player's side are negotiating.
- **Agreed** (Anlaşma): a fee or personal terms are agreed.
- **Signed** (İmza): the buying club has announced it. Nothing else makes a move signed.

A row in Contents is one short title and a short line of four stations, filled in the section colour up to the current stage, with a soft ring on the current one, then the stage word and either the number of outlets reporting it or "Club confirmed". No photos, no logos, no gist: the stage line is the picture. Rows run furthest along first. On wide screens they sit under the section columns, four to a row.

## The move's page

`/<date>/<slot>/transfers/<move id>`: the league, the title, the two clubs, the four stages as a large track with the day each one was reached, where the move stands now, at most two numbers (fee, contract length), **who is saying it** (each outlet once, at the furthest stage it reported, agencies and established outlets first), and **what would make it signed** until it is.

The stage is the evidence label of a move, so a move has no Confirmed or Reported mark. A move that goes back (talks break down) leaves the bulletin rather than showing a stage it no longer has.
