import type { Metadata } from "next";
import { season, rival } from "@/data/mock";
import { PageHeading, ComingSoon } from "@/components/ui/section";
import { RivalPreview } from "@/components/rival/rival-preview";
export const metadata: Metadata = { title: "Career" };
export default function CareerPage() {
  return (
    <>
      <PageHeading
        eyebrow="CAREER / THE LONG GAME"
        title="WRITE YOUR STORY"
        description="One session. One match. One season at a time."
      />
      <section className="career-stage panel">
        <div className="career-copy">
          <span className="eyebrow">CURRENT CHAPTER · MOCK SEASON</span>
          <h2>
            SEASON <span>{season.number}</span>
          </h2>
          <p className="muted">The first chapter of your ascent.</p>
          <div className="season-record">
            <span className="eyebrow">CURRENT RECORD</span>
            <strong>
              {season.wins}
              <span>W</span> <i>–</i> {season.losses}
              <span>L</span>
            </strong>
          </div>
          <div className="career-details">
            <div>
              <span className="eyebrow">CURRENT RIVAL</span>
              <strong>{rival.name}</strong>
            </div>
            <div>
              <span className="eyebrow">RIVAL OVR</span>
              <strong>{rival.ovr}</strong>
            </div>
            <div>
              <span className="eyebrow">NEXT MATCH</span>
              <strong>{season.nextMatch}</strong>
            </div>
          </div>
          <span className="availability">MATCHES ARRIVE IN PHASE 4</span>
        </div>
        <RivalPreview initialColor={rival.color} />
      </section>
      <div className="feature-grid">
        <ComingSoon
          title="Season History"
          description="Every chapter of your career, preserved."
          phase={4}
          icon="grid"
        />
        <ComingSoon
          title="Trophy Room"
          description="A home for meaningful milestones."
          phase={4}
          icon="career"
        />
        <ComingSoon
          title="Past Player Cards"
          description="Permanent snapshots of your progress."
          phase={4}
          icon="player"
        />
      </div>
    </>
  );
}
