import {
  Utensils,
  ShoppingCart,
  Home,
  Shirt,
  Sparkles,
  Droplet,
  Car,
  Landmark,
  HeartPulse,
  Gift,
  MoreHorizontal,
  Laptop,
  type LucideIcon,
} from "lucide-react";
import { Category } from "@/lib/types";

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  Food: Utensils,
  Groceries: ShoppingCart,
  Household: Home,
  Dressing: Shirt,
  Beauty: Sparkles,
  Skincare: Droplet,
  Transport: Car,
  Culture: Landmark,
  Therapy: HeartPulse,
  Gift: Gift,
  Miscellaneous: MoreHorizontal,
  Electronics: Laptop,
};

interface Props {
  category: Category;
  className?: string;
}

export default function CategoryIcon({ category, className }: Props) {
  const Icon = CATEGORY_ICONS[category] ?? MoreHorizontal;
  return <Icon className={className} aria-hidden />;
}
