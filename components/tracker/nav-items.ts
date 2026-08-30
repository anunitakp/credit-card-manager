import {
  BarChart3,
  CreditCard,
  IndianRupee,
  LayoutDashboard,
  Luggage,
  Receipt,
  StickyNote,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Shorter label for the mobile bottom bar. */
  shortLabel?: string;
  icon: LucideIcon;
}

/**
 * Navigation order, shared by the desktop rail and the mobile bar.
 *
 * The four daily destinations come first — the ones reached several times a
 * day — and Credit Cards is among them, since card spending is entered there.
 * Statistics and the rest are things you open occasionally, so they sit after
 * the fold on desktop and inside More on mobile.
 */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/cards", label: "Credit Cards", shortLabel: "Cards", icon: CreditCard },
  { href: "/statistics", label: "Statistics", shortLabel: "Stats", icon: BarChart3 },
  { href: "/trips", label: "Trips", icon: Luggage },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/salary", label: "Salary", icon: IndianRupee },
];

/** The four that get a slot in the mobile bottom bar; the rest live in More. */
export const BOTTOM_NAV: NavItem[] = PRIMARY_NAV.slice(0, 4);
export const MORE_NAV: NavItem[] = PRIMARY_NAV.slice(4);

/**
 * Whether a nav item should read as current for a given pathname. Only the
 * dashboard needs an exact match — every other section owns its subtree.
 */
export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
