# Contributing

## Setup

Requires Node 22 (see `.nvmrc`) and pnpm (the version is pinned in `package.json`; `corepack enable` picks it up).

```sh
pnpm install
pnpm check   # format, lint, typecheck and tests: the same gates as CI
```

## Repository layout

| Path            | What lives there                                                  |
| --------------- | ----------------------------------------------------------------- |
| `packages/core` | Shared types, schemas and pure domain logic. No I/O.              |
| `packages/*`    | Further libraries (pipeline, verification, …) as they are added   |
| `apps/*`        | Deployable apps (the website, the Hot News monitor)               |
| `docs/product`  | User stories and features. The source of truth for what we build. |
| `docs/design`   | The design brief and design decisions                             |

## How changes are made

- **One small PR per change**, always against `main`. A PR should do one thing and be easy to review.
- **Branches** are named `feature/<description>` or `bugfix/<description>`.
- **Link the why.** Reference the user story or feature a change serves (for example `US-20`, `F-06`) in the PR description.
- **Green CI before merge.** `pnpm check` must pass locally and in CI.
- **Tests with behaviour.** New logic comes with unit tests next to it (`*.test.ts`).

## Code conventions

- TypeScript in strict mode everywhere. Avoid `any`; validate external data at the boundary.
- Keep domain logic pure and in `packages/core` or a dedicated package. Keep I/O at the edges.
- Configuration (sources, schedules, model choices) lives in typed config, not scattered constants.
- Name things in the product's vocabulary: bulletin, story, section, evidence label, Hot News.
