# Phase 2A.5 — Workout Data Foundation Audit

A small stabilization checkpoint before Live Workout. No workout execution,
actual-performance records, progression, AI generation, or game systems are added.
The Phase 2A screens and styling are preserved, including the earlier safe-area fix.
Expo development controls were not changed.

## Audit and files

| Area | Decision / files |
| --- | --- |
| Exercise model | Preserve the shared Exercise metadata and discriminated isCustom/difficulty contract in `src/types/training.ts`. `src/training/validation.ts` validates both built-in and custom exercises through `isExercise`. No incompatible second model. |
| Equipment | Structured arrays; add Low Bar to `src/config/training.ts` and the Equipment type. No display strings used as storage identities. |
| Library | `src/data/exercises.ts`: retain 42 exercises and every stable ID. Corrections below. |
| Workout model | Keep WorkoutPlan → ordered WorkoutExercise[] → ordered SetTarget[]. Array position defines exercise/set order. Individual IDs survive editing; summaries are display-only. |
| Copies | `src/training/plans.ts`: typed deep copies for plans, exercises, and repository results. Editing in `training-workspace.tsx` uses the helper instead of a JSON cast; no visual changes. |
| Persistence | `src/storage/training-repository.ts`: detached submissions/results, one operation queue for load/commit/reset, original createdAt preserved during edits, failed reload blocks stale writes. |
| Compatibility | `src/storage/training-schema.ts`: conservative version-1 normalization with backup before rewrite. Existing valid Phase 2A data is not rewritten. |
| Regression coverage | `tests/training-audit.test.cjs` and optional `tests/browser-audit.cjs`; existing domain/input tests retained. |

## Metadata corrections and assumptions

- **Dead Hang**: primary Back + Arms, secondary Shoulders. Arms is the V1 proxy
  for forearms/grip within six broad body groups. This classification is not an
  assertion of muscle-growth magnitude or a rating multiplier.
- **Inverted Row**: Low Bar replaces Barbell. This identifies a fixed low
  horizontal support rather than prescribing a free-weight barbell. Other
  apparatus variants can be modeled later; the library is not expanded now.
- **Jumping Jack**: primary Legs + Shoulders, secondary Core; category remains
  Athletic. Multiple primary groups represent the broad movement.
- Other existing library metadata remains suitable for this coarse V1 taxonomy.
  Difficulty values remain draft metadata and custom difficulty stays null.

## Storage compatibility and failure behavior

Key `ascend.training.v1` and `version: 1` are unchanged. No schema-breaking fields
or invented migrations are necessary for already-valid Phase 2A plans.

For version 1, normalization may fill **missing** custom secondary areas with [],
missing custom difficulty/progressionFamily with null, and missing Recent with [].
Recent is derived selection data: duplicate, dangling, and excess IDs may be
removed while preserving newest-first order. Validate the full result before any
write. Back up original raw JSON first; a failed backup/normalized write is
retryable and must not erase the original. Normalization is idempotent.

Never infer IDs, timestamps, names, primary areas, equipment, tracking types,
rest, or targets. Non-null custom difficulty is not silently corrected. Unknown
versions, unversioned demo data, broken references, and incomplete/invalid targets
use the existing error/retry/explicit backed-up reset flow. No new cloud, auth,
backend, storage dependency, or migration framework is added.

The repository copies mutable submissions immediately and returns detached data.
Mutating a draft, a commit result, or a load result cannot silently change stored
or retained templates. Reads, resets, and writes run in submission order. Editing
preserves the workout ID and creation time; duplication generates fresh plan,
entry, and set IDs without shared mutable objects.

## Validation

Keep existing requirements: nonblank names up to 80 characters; 1–30 exercises;
1–20 sets per exercise; positive integer planned reps/seconds; nonnegative finite
load/rest; valid enums/references and unique IDs within their containing arrays.
Zero weight and zero rest are valid. Reject whitespace-only identifiers. Exercise
validation checks primary/secondary disjointness and structured equipment values.
Referenced custom exercise deletion or tracking-type changes remain blocked;
renaming/editing other metadata preserves references and target values.

## Phase 2B hand-off

Saved workouts contain **targets only**. A future session needs its own identity,
copied template targets, and copied exercise metadata, plus separate actual
results. Do not record actual values by overwriting the template or infer an
actual result from an unchanged target. Later template/catalog edits or deletion
must never relabel or erase completed session evidence. The repository copy
boundary helps isolation but does not itself implement historical snapshots.
No unused session interface or execution state machine is introduced now.

## Verification

- Domain/repository tests: 17 passed (`npm test`), including the eight audit tests.
- `npm run typecheck`: passed from `my-app`.
- `npm run lint`: passed with no warnings.
- `env -u NO_COLOR CI=1 npx expo export --platform all --max-workers 1 --output-dir /tmp/ascend-audit-export`:
  passed; iOS/Android Hermes bundles and 12 static web routes generated.
- `tests/browser-audit.cjs`: passed on the production export. Custom create/edit/
  reload, multi-equipment metadata, per-set targets/rest/reload, workout edit ID and
  createdAt retention, independent duplicate editing, confirmed delete/reload,
  referenced custom deletion/tracking protection, and referenced renaming verified.
- Existing `tests/browser-input.cjs`: passed at 320px. Direct set-count replacement,
  individual targets, decimal +/- input, reps/weight/time targets, and reload remain
  correct. No horizontal overflow or browser console/page errors in these flows.
- `git diff --check`: passed.
- Browser tests use an isolated Playwright installation, not a new app dependency.
  Run with `NODE_PATH` / `PLAYWRIGHT_BROWSERS_PATH` pointing to that installation and
  `ASCEND_QA_URL` pointing to the served production export.
- Physical iPhone/Android testing is not claimed. This audit changes data behavior,
  and browser reload tests exercise the web implementation of the same repository.
