# Share previews

A link to CSPNews pasted into a chat or posted on social media shows the page's headline, one summary line and one picture, not a bare address. Every page carries them as Open Graph and Twitter card tags, plus a canonical link and `hreflang` links between the English and Turkish copies.

- **Story, Spotlight, transfer and person pages** use their own headline and summary line, and their photo.
- **A bulletin, its one-minute page and the home page** use the first three headlines as the description and the first photo of the bulletin.
- **Every other page** uses the site's plain card (`apps/web/public/og.png`): the wordmark on the dark ground, with a line of the hour colour and the tagline in both languages.

The picture is the saved photo cut to 1200 x 630 and compressed to about 180 KB at build time (`apps/web/src/pages/share/[id].jpg.ts`), because chat apps skip pictures over a few hundred kilobytes and the saved photos are often over a megabyte. Nothing is added to the page itself, so the reading screens do not change.
