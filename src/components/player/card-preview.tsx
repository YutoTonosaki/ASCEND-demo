"use client";
import { useState } from "react";
import { PlayerCard } from "./player-card";
import { cardTiers } from "@/config/visuals";
import type { CardTier, CardIntensity, Player } from "@/types/domain";
export function CardPreview({ player }: { player: Player }) {
  const [tier, setTier] = useState<CardTier>(player.tier);
  const [intensity, setIntensity] = useState<CardIntensity>(player.intensity);
  return (
    <section className="card-preview panel">
      <div className="section-heading">
        <h2>PLAYER IDENTITY</h2>
        <span className="eyebrow">VISUAL PREVIEW</span>
      </div>
      <PlayerCard player={player} tier={tier} intensity={intensity} />
      <fieldset>
        <legend>CARD FINISH</legend>
        <div className="segmented">
          {(Object.keys(cardTiers) as CardTier[]).map((key) => (
            <button
              key={key}
              aria-pressed={tier === key}
              onClick={() => setTier(key)}
            >
              {key === "elite" ? "Elite" : cardTiers[key].label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>EFFECT INTENSITY</legend>
        <div className="segmented">
          {(["low", "mid", "high"] as const).map((key) => (
            <button
              key={key}
              aria-pressed={intensity === key}
              onClick={() => setIntensity(key)}
            >
              {key}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="fine-print">
        Explore the visual finishes. Ratings stay the same.
      </p>
    </section>
  );
}
