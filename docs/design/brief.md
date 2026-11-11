# Design brief

The brief for designing CSPNews. The design starts from three inputs:

1. [User stories](../product/user-stories.md): what the reader needs.
2. [Features and shared systems](../product/features.md): what we're building, and the parts every screen shares.
3. The owner's two design systems, "Fireside × Front Office × Game Night" and the copper/Geist portable system. They are **inspiration, not rules**. Borrow what suits a calm news reader. Leave behind what was made for sports or a work tool. Where the two disagree, propose a choice with a reason.

## The goal

One place to focus, and the most information for the least attention. The reader is easily distracted, so the product must hold their focus gently and never compete with itself.

## Focus principles

1. **One thing at a time.** One column. On phones, one story per screen. No sidebars, ads, autoplay or "related" clutter. (US-10)
2. **A bulletin has an end.** Story caps, a progress line, and a "You're caught up" screen. No infinite scroll. (US-05)
3. **Read as deep as you want.** Headline, then gist, then summary, then evidence. Most days the gist is enough. (US-11)
4. **Facts stand out.** Numbers, names and dates are visually anchored. Every story leads with an image or outlet logo, never a wall of text. (US-12)
5. **Nothing interrupts.** Hot News is a quiet strip, never a pop-up. Motion happens only when data changes and respects reduced motion. (US-15, US-30)
6. **Pick up where you left off.** Position is always restored. (US-13)
7. **Comfortable to read.** Lines of 60 to 70 characters, generous spacing, dark by default, adjustable text size, an optional reading ruler. (US-15)

## Signature ideas to explore

These should make CSPNews feel like its own product. They're starting points for the designers, not decisions.

- **The evidence label** as the signature component: how solid a story is, readable at a glance and never by colour alone. (US-20)
- **A day timeline** showing the bulletins and Hot News moments, so the day has a visible shape. (F-01, F-11)
- **Living stories** that visibly grow instead of repeating. (US-23)

## Screens to design

| Screen                                                       | Features                     |
| ------------------------------------------------------------ | ---------------------------- |
| Bulletin reader (phone and desktop)                          | F-03, F-04, F-05, F-06, F-08 |
| Evidence drawer                                              | F-07                         |
| Hot News strip and Developing state                          | F-11                         |
| "You're caught up"                                           | F-03                         |
| Monitor                                                      | F-12                         |
| Settings: language, theme, text size, ruler                  | F-09, F-10, F-18             |
| Archive                                                      | F-16                         |
| Loading, empty, error and stale states for each of the above | All                          |

## How the design is made

- Two young designers each propose a bold, distinct concept. A senior UX designer reviews them for clarity, scan speed, mobile ergonomics and accessibility. A lead designer combines the strongest ideas into one direction.
- The owner sees both concepts beside the lead's pick, as real mockups with real stories.
- Matters of taste are offered as 2 to 4 options with one recommended.
- Implementation follows approval, in small PRs.

## Quality bar for every UI change

- Screenshots at 1280 dark, 390 light and 360 light.
- No horizontal page scroll at 360, 390 and 430 px.
- AA contrast in both themes.
- Correct behaviour under reduced motion.
- Every page has designed loading, empty, error and stale states.
