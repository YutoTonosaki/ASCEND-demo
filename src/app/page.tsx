import Link from "next/link";
import { player, weekly, recovery, season } from "@/data/mock";
import { PlayerCard } from "@/components/player/player-card";
import { RivalPanel } from "@/components/rival/rival-panel";
import { PageHeading, Panel } from "@/components/ui/section";
import { Icon } from "@/components/ui/icon";
export default function Home() {
  return (
    <>
      <div className="heading-row">
        <PageHeading
          eyebrow={`THE TRAINING FACILITY / SEASON ${season.number}`}
          title="BUILD YOUR NEXT LEVEL"
          description="Every session is a step forward. Make this one count."
        />
        <span className="sample-label">DEMO PLAYER · MOCK DATA</span>
      </div>
      <div className="home-grid">
        <section className="player-overview">
          <div className="section-heading">
            <h2>YOUR PLAYER</h2>
            <Link href="/player" className="text-link">
              VIEW PROFILE <Icon name="arrow" size={14} />
            </Link>
          </div>
          <PlayerCard player={player} />
          <div className="player-note">
            <span className="status-dot" />
            ALL-ROUNDER<span>YOUR CAREER STARTS HERE</span>
          </div>
        </section>
        <div className="home-center">
          <Panel title="WEEKLY TARGET" kicker="CONSISTENCY > STREAKS">
            <div className="weekly-numbers">
              <div>
                <strong>
                  {weekly.completed}
                  <span> / {weekly.target}</span>
                </strong>
                <p className="muted">workouts this week</p>
              </div>
              <span className="form-pill">
                <span className="status-dot" />
                FORM: {weekly.form}
              </span>
            </div>
            <div className="week-days">
              {weekly.days.map((day, index) => (
                <div key={index}>
                  <span>{day.label}</span>
                  <div
                    className={`day-marker ${day.state}`}
                    aria-label={`${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][index]}: ${day.state}`}
                  >
                    {day.state === "complete" ? (
                      <Icon name="check" size={16} />
                    ) : day.state === "match" ? (
                      <Icon name="bolt" size={15} />
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="weekly-note">
              One more session to your weekly target.
              <br />
              <span>Rest days are part of the process.</span>
            </p>
          </Panel>
          <section className="training-cta">
            <div className="section-heading">
              <span className="eyebrow">SHOW UP FOR YOURSELF</span>
              <Icon name="train" size={24} />
            </div>
            <h2>
              THE WORK YOU PUT IN.
              <br />
              THE PLAYER YOU BECOME.
            </h2>
            <p className="muted">
              Your next level starts with your next session.
            </p>
            <Link href="/train" className="primary-button">
              START TODAY&apos;S TRAINING <Icon name="arrow" size={18} />
            </Link>
          </section>
        </div>
        <RivalPanel />
        <Panel
          title="RECOVERY STATUS"
          kicker="REST IS PART OF THE PLAN"
          className="recovery-panel"
        >
          <div className="recovery-grid">
            {recovery.map((item) => (
              <div className="recovery-item" key={item.area}>
                <span className={`recovery-symbol ${item.state.toLowerCase()}`}>
                  <Icon name="bolt" size={17} />
                </span>
                <div>
                  <h3>{item.area}</h3>
                  <p className={item.state.toLowerCase()}>{item.state}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="fine-print">
            Illustrative recovery status · Not calculated from training data.
          </p>
        </Panel>
      </div>
    </>
  );
}
