# Game logic boundary

Pure domain logic lives beside its providers (`growth`, `records`, `rewards`,
`career` and `cards`); persistence belongs in `src/storage`, not UI components.
Future Match/Season modules may use this directory when those phases are authorized.

Phase 4A Career persistence lives in `src/career/` and
`src/storage/career-repository.ts`. The Club catalog is `src/config/clubs.ts`;
future-facing contracts remain in `src/types/club.ts`. The obsolete mock
`data/club-career.ts` has been removed.

Seasons, scouting and transfers remain future work. Explicit transfer acceptance
must preserve tenures and immutable Season identity snapshots without modifying
physical ratings. Interest/offer/window rules belong in pure domain modules,
never card components.
