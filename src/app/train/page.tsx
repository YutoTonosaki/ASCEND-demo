import type { Metadata } from "next";
import { PageHeading, ComingSoon } from "@/components/ui/section";
import { Icon } from "@/components/ui/icon";
export const metadata: Metadata = { title: "Train" };
export default function TrainPage() {
  return (
    <>
      <PageHeading
        eyebrow="TRAINING FACILITY / FIND YOUR FOCUS"
        title="PUT IN THE WORK"
        description="Two ways to train. One direction: forward."
      />
      <div className="training-options">
        {[
          {
            number: "01",
            title: "AI COACH",
            subtitle: "A plan that grows with you.",
            description:
              "Future guided sessions will use your performance, equipment, available time, and recovery.",
            icon: "bolt" as const,
          },
          {
            number: "02",
            title: "CUSTOM WORKOUT",
            subtitle: "Your session. Your approach.",
            description:
              "Build your own sessions for home or the gym, with the exercises that fit your training.",
            icon: "train" as const,
          },
        ].map((item) => (
          <section key={item.number} className="training-option panel">
            <div className="section-heading">
              <span className="eyebrow">TRAINING MODE / {item.number}</span>
              <Icon name={item.icon} size={30} />
            </div>
            <span className="option-number" aria-hidden="true">
              {item.number}
            </span>
            <h2>{item.title}</h2>
            <h3>{item.subtitle}</h3>
            <p className="muted">{item.description}</p>
            <div className="locked-button">
              <Icon name="lock" size={16} /> AVAILABLE IN PHASE 2
            </div>
          </section>
        ))}
      </div>
      <div className="feature-grid two">
        <ComingSoon
          title="Saved Workouts"
          description="Keep your go-to sessions within reach."
          phase={2}
          icon="grid"
        />
        <ComingSoon
          title="Workout History"
          description="Look back on the work that moves you forward."
          phase={2}
          icon="train"
        />
      </div>
      <p className="page-note">
        The training floor is taking shape. Workout recording arrives in Phase
        2.
      </p>
    </>
  );
}
