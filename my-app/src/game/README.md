# Game logic boundary

Reserved for future pure game modules. Phase 1 contains no game calculations.
UI consumes typed fixtures from `src/data/mock.ts`. Add progression, recovery,
match, and season logic here only in their authorized roadmap phases.
Storage adapters belong in `src/storage`, not presentation components.

Club Career is also deferred to Phase 4. Its contracts are in `src/types/club.ts`;
the draft catalog is `src/config/clubs.ts`, and current mock career data is
`src/data/club-career.ts`. Future interest/offer/window decisions belong in pure
game modules here, never card components. Explicit transfer acceptance must
preserve tenures and Season identity snapshots without modifying physical ratings.
