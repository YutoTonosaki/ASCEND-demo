import type { CSSProperties } from "react";
import type { CardIntensity, CardTier, Player } from "@/types/domain";
import { cardTiers } from "@/config/visuals";
export function PlayerCard({
  player,
  tier = player.tier,
  intensity = player.intensity,
}: {
  player: Player;
  tier?: CardTier;
  intensity?: CardIntensity;
}) {
  const visual = cardTiers[tier];
  return (
    <article
      className={`player-card intensity-${intensity}`}
      style={
        {
          "--card-accent": visual.accent,
          "--card-deep": visual.deep,
        } as CSSProperties
      }
      aria-label={`${player.name}, overall ${player.ovr}, ${visual.label}, ${intensity} intensity`}
    >
      <div className="card-grid" aria-hidden="true" />
      <div className="card-shine" aria-hidden="true" />
      <div className="card-sparks" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="card-top">
        <span>ASCEND</span>
        <span>ATHLETE ID // 001</span>
      </div>
      <div className="card-hero">
        <div className="card-ovr">
          <strong>{player.ovr}</strong>
          <span>OVERALL</span>
        </div>
        <svg
          className="ascend-emblem"
          viewBox="0 0 140 170"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m70 9 60 128-35-15-25-58-25 58-35 15L70 9Z"
            fill="currentColor"
            opacity=".65"
          />
          <path d="m70 98 31 63-31-14-31 14 31-63Z" fill="currentColor" />
          <path
            d="M70 9v55M10 137l35-15M130 137l-35-15"
            stroke="white"
            opacity=".35"
          />
        </svg>
      </div>
      <div className="card-identity">
        <p>{player.archetype}</p>
        <h2>{player.name}</h2>
      </div>
      <div className="card-ratings">
        {Object.entries(player.ratings).map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="card-bottom">
        <span>◆ {visual.label.toUpperCase()}</span>
        <span>BUILT THROUGH EFFORT</span>
      </div>
    </article>
  );
}
