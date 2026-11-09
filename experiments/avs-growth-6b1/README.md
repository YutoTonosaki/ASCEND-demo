# Phase 6B.1 — read-only body-growth asset audit

**Asset gate blocked; there is no deforming viewer or Expo app in this directory.**
The current GLB has no skin, morph targets or six-region labels. No anatomical
masks, targets or bones are invented. New authoring is required before a meaningful
regional prototype can meet the requested quality/clothing constraints.

From the repository root:

```sh
node experiments/avs-growth-6b1/audit/inspect.cjs
node --test experiments/avs-growth-6b1/audit/audit.test.cjs
```

The inspector reads production/Lab bytes and source rig evidence; stdout is the
reproducible `audit/evidence.json` report. It never invokes the asset converter,
writes geometry, accesses app storage or imports gameplay code. Tests use Node's
existing test runner; no packages or new testing framework are installed.

See `my-app/docs/PHASE6B_1_BODY_GROWTH_FEASIBILITY.md` for the architecture,
provisional mapping proposal, blockers and prerequisites. No Phase 6B.2.
