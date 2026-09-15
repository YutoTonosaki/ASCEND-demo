import Link from "next/link";
import { rival, season } from "@/data/mock";
import { RivalAvatar } from "./rival-avatar";
import { Icon } from "@/components/ui/icon";
export function RivalPanel() {
  return (
    <section className="panel rival-panel">
      <div className="section-heading">
        <h2>THE NEXT CHALLENGE</h2>
        <span className="blue-dot">WEEKLY MATCH</span>
      </div>
      <div className="rival-stage">
        <div className="rival-copy">
          <p className="eyebrow">YOUR OPPONENT</p>
          <h3>{rival.name}</h3>
          <div className="rival-ovr">
            {rival.ovr}
            <span>OVR</span>
          </div>
          <span className="rival-tag">DIGITAL RIVAL</span>
        </div>
        <RivalAvatar color={rival.color} />
        <span className="stage-word" aria-hidden="true">
          VERSUS
        </span>
      </div>
      <Link href="/career" className="match-footer">
        <div>
          <span className="eyebrow">NEXT MATCH</span>
          <strong>
            {season.nextMatch}
            <span>{` // SEASON ${season.number}`}</span>
          </strong>
        </div>
        <Icon name="arrow" />
      </Link>
    </section>
  );
}
