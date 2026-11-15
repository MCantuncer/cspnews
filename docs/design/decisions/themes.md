# Themes

Four palettes, each its own set of colours, never an inversion of another:

- **Dark**: warm black, the dark side of Match device.
- **Black**: true black for OLED phones. Text is off-white (#ebe8e3), never pure white, because white letters on black glow and smear on OLED screens. Cards sit on #111 so they keep their edges, and photos are a step dimmer so a bright picture does not glare.
- **Paper**: warm paper, the calm light reading option.
- **Clean**: pure white with neutral greys and near-black text, the light side of Match device.

**Match device** is the default for a reader who has not chosen: Clean on a light phone, Dark on a dark one. A choice in Settings or the reader corner is kept in this browser (`cspnews:theme`) and applied before the first paint. Each choice shows a small disc in its page colour, so Dark and Black, or Paper and Clean, read apart at a glance. The phone's browser bar takes the page colour.

Every palette defines every colour token in `styles/tokens.css`; `lib/themes.test.ts` fails when one is missing, when the light side of Match device drifts from Clean, or when the browser-bar colours in `Base.astro` drift from `--bg`. A new colour token therefore needs four values. Feature styles with their own colours (the word game, the Google button) give one value for the dark themes and one for Paper and Clean.
