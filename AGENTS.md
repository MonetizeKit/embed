# AGENTS.md

## Project overview

`@monetizekit/embed`: browser embed (script tag / CDN bundle) for MonetizeKit
pricing and paywall widgets. Source in `src/`, built with `tsup` into an ESM
entry and a CDN bundle.

## Commands

- `pnpm install --frozen-lockfile`
- `pnpm lint`, `pnpm typecheck`, `pnpm build`
- `pnpm check-entry` (verifies the embed API and the CDN bundle are present),
  `pnpm smoke`

## Conventions

- Browser-safe only: the embed runs with a publishable key and must never
  accept or log a secret key.
- Types come from `@monetizekit/types`; do not redeclare API shapes here.
- Public API changes need a changeset.

## Verifying your work

```
$ pnpm lint
> eslint .
(no output, exit 0)

$ pnpm typecheck
> tsc --noEmit
(no output, exit 0)

$ pnpm build
DTS ⚡️ Build success in ~450ms
DTS dist/index.d.ts  1.95 KB
DTS dist/index.d.cts 1.95 KB

$ pnpm check-entry
Package entry guard passed: embed API + CDN bundle present.
```

## Releasing

Published to npm by Changesets from `.github/workflows/release.yml` on push to
`main`, with npm provenance. Add a changeset (`pnpm changeset`) to any PR that
changes the published surface. Because `main` only receives promotions from
`delivery`, a release is the result of a promotion, not of a feature merge.

## SDLC and promotion chain

- Branches: `feature/*` -> PR -> `development` -> `delivery` -> `main`. Feature
  PRs target `development`. Promotion between stages is a promotion PR from
  the upstream stage branch (`development -> delivery`, `delivery -> main`);
  where this repository has `.github/workflows/promote.yml`, that workflow
  opens it when the stage gate is green, and `delivery -> main` is always
  merged by a human. Never open a feature PR against `main` or `delivery`.
- Every PR must pass the `Required Checks Gate` job in `.github/workflows/ci.yml`.
  The `Shadow Review (advisory)` job posts a model review comment; it never
  blocks. React with a thumbs-down to dismiss a finding.
- Agent roles, model IDs, tools and autonomy for the whole fleet are declared in
  [`MonetizeKit/.github/agent-policy.json`](https://github.com/MonetizeKit/.github/blob/main/agent-policy.json).
  Never hardcode a model ID in this repository.
- Conventional commits (`feat:`, `fix:`, `chore:`, ...). Position and status live
  in Linear (team `MK`); reference the issue key in the PR body when one exists.
- The fleet-wide plan is
  [`docs/engineering/ai-native-sdlc-plan.md`](https://github.com/MonetizeKit/app-monetizekit-monorepo/blob/main/docs/engineering/ai-native-sdlc-plan.md)
  in the monorepo.
