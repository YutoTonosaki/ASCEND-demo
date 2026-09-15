"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
const destinations: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "HOME", icon: "home" },
  { href: "/train", label: "TRAIN", icon: "train" },
  { href: "/player", label: "PLAYER", icon: "player" },
  { href: "/career", label: "CAREER", icon: "career" },
  { href: "/shop", label: "SHOP", icon: "shop" },
];
export function Navigation() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {destinations.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname === item.href ? "page" : undefined}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
