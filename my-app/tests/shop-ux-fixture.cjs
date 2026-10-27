require("./register.cjs");
const R = require("../src/rewards/domain.ts");
const { initializePlayer } = require("../src/growth/domain.ts");
function seed(locale = "en") {
  const sessions = { version: 1, active: null, completed: [] };
  const player = {
    version: 1,
    player: initializePlayer(
      "shop-ux",
      "2026-08-01T00:00:00.000Z",
      null,
      sessions,
    ),
  };
  let rewards = R.emptyRewards();
  for (let i = 1; i <= 4; i++) {
    const localDay = `2026-09-0${i}`;
    rewards = R.applyReward(rewards, {
      sessionId: `ux-${i}`,
      playerId: player.player.id,
      completedAt: `${localDay}T12:00:00.000Z`,
      localDay,
      weekId: R.weekId(localDay),
      offsetMinutes: 0,
    });
  }
  return {
    "ascend.player.v1": JSON.stringify(player),
    "ascend.sessions.v1": JSON.stringify(sessions),
    "ascend.rewards.v1": JSON.stringify(rewards),
    "ascend.settings.v1": JSON.stringify({ version: 1, settings: { locale } }),
  };
}
module.exports = { seed };
