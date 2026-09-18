# Phase 2A — Training foundation verification

## Scope and structure

The native app in `my-app` keeps the existing five tabs, visual theme, Player Card,
Club foundation, and Rival presentation. The earlier root Next.js app is unchanged.

- `src/types/training.ts`: Exercise/CustomExercise union, discriminated SetTarget,
  ordered WorkoutExercise, WorkoutPlan, versioned TrainingData.
- `src/data/exercises.ts`: 42 standard exercises, stable IDs, draft difficulty and
  progression-family metadata. `src/config/training.ts`: defaults and input bounds.
- `src/training/`: pure plan helpers, runtime validation, shared training provider.
- `src/storage/`: generic adapter, AsyncStorage implementation, serialized repository.
- `src/components/training/`: picker, custom editor, target controls, builder, plan
  detail/list, and custom exercise management inside the existing TRAIN tab.
- `tests/training.test.cjs`: domain and repository regressions, using Node's test
  runner and the existing TypeScript compiler; no testing runtime dependency added.

## Decisions

Custom difficulty is always null. Existing saved-plan references prevent deletion
and tracking-type changes; name/metadata edits remain possible. Saved plans refer
to live exercise metadata; future session records must copy their own evidence.

Targets are stored per set in reps, kilograms + reps, or seconds. Rest defaults to
90 seconds per exercise. Defaults/bounds are editing settings, not progression or
training recommendations. Duplicate plans have fresh plan, exercise-entry, and set
IDs and no shared mutable objects. Recent is six unique selected IDs.

A small local workspace inside TRAIN retains unsaved edits during tab switches.
Back confirms discarding changed plans. Drafts are intentionally not persisted
across reload/termination. Save confirms only after storage succeeds. There are no
sessions, actual performance records, timers, or completion/reward side effects.

AsyncStorage 2.2.0 is the only new runtime dependency, selected by `expo install`
for the existing SDK. The repository validates the `ascend.training.v1` document,
serializes writes, and retains previous state on failed writes. Missing data starts
empty; damaged/unsupported data blocks writes and shows retry/confirmed reset.
Reset preserves raw data under a timestamped backup key before replacing it.
No cloud backup, encryption, backup-management UI, or schema migration is included.

## Verification

Commands run from `my-app`:

- `npm run typecheck`: passed.
- `npm run lint`: passed, no warnings.
- `npm test`: 9 passed; library coverage, tracking models, reference protection,
  custom difficulty, deep duplication, per-set targets/order, invalid schemas,
  persistence round-trip, concurrent/failed writes, and backup/reset failures.
- `env -u NO_COLOR CI=1 npx expo export --platform all --max-workers 1 --output-dir /tmp/ascend-phase2a-export`:
  iOS and Android Hermes bundles plus 12 static web routes exported successfully.
  One intermediate export hit a disk-space error; removing this task's temporary
  npm cache freed space and the subsequent export succeeded.
- `git diff --check`: passed.

Production web export tested with headless Chromium, fresh isolated browser data:

- Create a plan with reps, weighted, timed, and newly created custom exercises.
- Search, body/equipment/tracking filters, no-results creation, immediate selection,
  and persisted Recent sections.
- Set count controls, individual targets, rest configuration, exercise ordering/removal.
- Saved-plan create/view/edit, deep duplicate, cancel/confirm deletion.
- Custom create/rename/delete; referenced deletion and tracking changes rejected.
- Browser refresh restores custom exercises, Recent, plans, and targets.
- Unsaved plan survives tab switching; discard confirmation can be cancelled.
- Malformed storage remains intact until explicit reset; reset makes a raw backup.
- HOME/TRAIN/PLAYER/CAREER/SHOP navigate at 320, 390, and 430px widths without
  horizontal page overflow; no browser console/page errors in this flow.
- Card preview is separate from current earned-tier information.
- Expanded picker/target controls checked at 320px; actions have at least 44px
  touch targets. Decimal kilogram values survive editing and save/reload.
- Simulated 59px top / 34px bottom safe-area values keep the header, bottom tabs,
  and full-screen picker clear. This is a browser-provider simulation, not an
  iPhone device test. Escape dismisses picker and confirmation dialogs.

### Re-running the input regression

The final exported build passed `tests/browser-input.cjs`: decimal input with +/-
controls and its persisted values matched after reload; replacing the set count
preserved the existing individual targets at 320px, with no console/page errors.

`tests/browser-input.cjs` checks decimal input with +/- controls, clearing/replacing
set count without losing per-set targets, all three tracking types, and reload.
It uses Playwright as a separate QA tool, not an application dependency. Serve the
export at `ASCEND_QA_URL` (default `http://127.0.0.1:8096`) and run with the external
Playwright installation on Node's module path, for example:

```sh
NODE_PATH=/tmp/ascend-qa/node_modules PLAYWRIGHT_BROWSERS_PATH=/tmp/ascend-qa/browsers node tests/browser-input.cjs
```

## Physical-device follow-up

Production export compiles assets and JavaScript; it is not a signed native binary
or proof of a physical-device run. No iPhone/Android device was available here.
Use `npx expo start --go --lan` with SDK-compatible Expo Go to check:

1. Native safe areas, keyboard appearance/dismissal, and scrolling to Save.
2. VoiceOver/TalkBack labels, modal focus, decimal keyboard input, and large text.
3. Android hardware Back, iOS tab changes, and draft discard confirmation.
4. Native persistence after fully closing/reopening the app.
5. Thumb reach and 44px controls during typical training-plan setup.

Phase 2B remains intentionally deferred: live sessions, actual performance, timers,
rest countdown, workout history/completion, and rule-based AI plan generation.
Phase 3 physical progression and Phase 4 Club/Career simulation remain deferred.
