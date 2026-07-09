---
name: TypeScript baseline errors
description: Pre-existing TS errors in the repo that should not be counted as regressions.
---

As of the current HEAD (~July 2026), running `tsc --project tsconfig.check.json` (tsconfig.app.json with `types: []` to strip vitest globals) yields **15 pre-existing error lines** that are not caused by our changes:

1. `src/components/ui/sidebar.tsx` — TS2307 cannot find `@/hooks/use-mobile`
2. `src/context/LanguageContext.tsx` — TS2352 Navigator readonly cast
3. `src/pages/ChatPage.tsx(813)` — TS2322 Illu name string not in union
4. `src/pages/MesDemandesPage.tsx` — TS2339 `archived` missing from local Demande interface (multiple lines)
5. `src/pages/MonPortefeuille.tsx` — TS2349/TS2448 `t` hoisting issue (2 occurrences × 2 lines)

**How to verify:** install deps with `pnpm install`, write a `tsconfig.check.json` extending `tsconfig.app.json` with `"types": []`, run `/home/runner/workspace/node_modules/.bin/tsc --project tsconfig.check.json`. Count `grep "^src/"` lines — should be ≤15 for a clean pass.
