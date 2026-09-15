import type { Metadata } from "next";
import { player } from "@/data/mock";
import { ratingLabels } from "@/config/visuals";
import type { AthleticRating } from "@/types/domain";
import { CardPreview } from "@/components/player/card-preview";
import { PageHeading, Panel, ComingSoon } from "@/components/ui/section";
export const metadata: Metadata = { title: "Player" };
export default function PlayerPage() {
  return (
    <>
      <PageHeading
        eyebrow="PLAYER DEVELOPMENT / YOUR IDENTITY"
        title="BUILT, NOT GIVEN"
        description="A snapshot of your ability. A foundation for what comes next."
      />
      <div className="player-layout">
        <CardPreview player={player} />
        <div className="space-y-5">
          <Panel title="ATHLETIC RATINGS" kicker="MOCK RATINGS / 99">
            <p className="rating-summary">
              <strong>Strength leads the way.</strong> Power and athleticism
              have the most room to grow.
            </p>
            <div className="ratings-list">
              {Object.entries(player.ratings).map(([key, value]) => (
                <div className="rating-row" key={key}>
                  <span className="rating-code">{key}</span>
                  <span className="rating-name">
                    {ratingLabels[key as AthleticRating]}
                  </span>
                  <div className="rating-track">
                    <span style={{ width: `${(value / 99) * 100}%` }} />
                  </div>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="BODY RATINGS" kicker="MOCK RATINGS / 99">
            <div className="body-ratings">
              {Object.entries(player.bodyRatings).map(([key, value]) => (
                <div key={key}>
                  <div>
                    <span>{key}</span>
                    <strong>{value}</strong>
                  </div>
                  <div className="rating-track">
                    <span style={{ width: `${(value / 99) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
      <div className="feature-grid">
        <ComingSoon
          title="Personal Records"
          description="Your strongest moments, recorded."
          phase={3}
          icon="career"
        />
        <ComingSoon
          title="Skill Tree"
          description="Build ability. Unlock your next challenge."
          phase={3}
          icon="grid"
        />
        <ComingSoon
          title="Archetype"
          description={`${player.archetype} · Discover your training identity.`}
          phase={3}
          icon="player"
        />
      </div>
    </>
  );
}
