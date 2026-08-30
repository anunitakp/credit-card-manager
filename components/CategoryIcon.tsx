import {
  BookOpen,
  Car,
  Droplet,
  Gift,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Luggage,
  MoreHorizontal,
  Shirt,
  ShoppingCart,
  Sparkles,
  Utensils,
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
  "Books & Subscription": BookOpen,
  Therapy: HeartPulse,
  Gift: Gift,
  Electronics: Laptop,
  Trip: Luggage,
  Miscellaneous: MoreHorizontal,
};

interface Props {
  category: Category;
  className?: string;
}

export default function CategoryIcon({ category, className }: Props) {
  const Icon = CATEGORY_ICONS[category] ?? MoreHorizontal;
  return <Icon className={className} aria-hidden />;
}
