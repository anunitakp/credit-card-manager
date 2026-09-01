import {
  Bath,
  BedDouble,
  Car,
  Gift,
  MoreHorizontal,
  Plane,
  Shirt,
  Ticket,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { TripCategory } from "@/lib/types";

/**
 * One icon per trip category, mirroring {@link CATEGORY_ICONS} for the
 * everyday categories. Chosen so the nine read apart at a glance in a legend:
 * getting there, sleeping, moving around, eating, and so on.
 */
export const TRIP_CATEGORY_ICONS: Record<TripCategory, LucideIcon> = {
  Travel: Plane,
  Stay: BedDouble,
  Transport: Car,
  Food: Utensils,
  Dress: Shirt,
  "Accessories & Toiletries": Bath,
  Souvenirs: Gift,
  Activities: Ticket,
  Others: MoreHorizontal,
};

interface Props {
  category: TripCategory;
  className?: string;
}

export default function TripCategoryIcon({ category, className }: Props) {
  const Icon = TRIP_CATEGORY_ICONS[category] ?? MoreHorizontal;
  return <Icon className={className} aria-hidden />;
}
