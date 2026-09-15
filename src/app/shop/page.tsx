import type { Metadata } from "next";
import { creditBalance } from "@/data/mock";
import { PageHeading } from "@/components/ui/section";
import { Icon } from "@/components/ui/icon";
export const metadata: Metadata = { title: "Shop" };
const categories = [
  {
    title: "Card Background",
    description: "Set the scene for your player.",
    art: "background",
  },
  {
    title: "Border",
    description: "Put your progress in the spotlight.",
    art: "border",
  },
  {
    title: "Aura",
    description: "Bring a little energy to your identity.",
    art: "aura",
  },
  { title: "Title", description: "Make a name for yourself.", art: "title" },
  {
    title: "Badge",
    description: "Wear your identity with pride.",
    art: "badge",
  },
  {
    title: "Rival Color",
    description: "A new shade of competition.",
    art: "color",
  },
  {
    title: "Victory Effect",
    description: "Give your big moments a signature.",
    art: "victory",
  },
];
export default function ShopPage() {
  return (
    <>
      <div className="heading-row">
        <PageHeading
          eyebrow="COSMETICS / MAKE IT YOURS"
          title="YOUR OWN SIGNATURE"
          description="Express your style. Your ratings are earned through training."
        />
        <div className="balance">
          <span className="eyebrow">DEMO BALANCE</span>
          <strong>
            {creditBalance.toLocaleString("en-US")} <span>CR</span>
          </strong>
        </div>
      </div>
      <div className="shop-grid">
        {categories.map((category, index) => (
          <article className="shop-item panel" key={category.title}>
            <div
              className={`cosmetic-art art-${category.art}`}
              aria-hidden="true"
            >
              {category.art === "title" ? (
                <span>THE ASCENT</span>
              ) : category.art === "badge" ? (
                <Icon name="career" size={55} />
              ) : category.art === "victory" ? (
                <Icon name="bolt" size={65} />
              ) : (
                <div className="cosmetic-shape" />
              )}
              <span className="art-index">0{index + 1} / COLLECTION</span>
            </div>
            <div className="shop-description">
              <h2>{category.title}</h2>
              <p className="muted">{category.description}</p>
              <span className="availability">
                <Icon name="lock" size={11} /> AVAILABLE IN PHASE 5
              </span>
            </div>
          </article>
        ))}
      </div>
      <p className="page-note">
        Cosmetic concepts only. Purchases, inventory, and rewards arrive in
        Phase 5.
      </p>
    </>
  );
}
