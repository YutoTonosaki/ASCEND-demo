import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";
export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>
        {title}
        <span className="accent">.</span>
      </h1>
      <p className="muted">{description}</p>
    </header>
  );
}
export function Panel({
  title,
  kicker,
  children,
  className = "",
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="section-heading">
        <h2>{title}</h2>
        {kicker && <span className="eyebrow">{kicker}</span>}
      </div>
      {children}
    </section>
  );
}
export function ComingSoon({
  title,
  description,
  phase,
  icon = "lock",
}: {
  title: string;
  description: string;
  phase: number;
  icon?: IconName;
}) {
  return (
    <article className="coming-soon">
      <div className="feature-icon">
        <Icon name={icon} size={23} />
      </div>
      <div>
        <h3>{title}</h3>
        <p className="muted">{description}</p>
        <span className="availability">
          <Icon name="lock" size={11} /> AVAILABLE IN PHASE {phase}
        </span>
      </div>
    </article>
  );
}
