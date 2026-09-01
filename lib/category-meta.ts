import { Category, TripCategory } from "./types";

/**
 * Chart colours, one per category.
 *
 * Two sets, because a palette that stays legible on milky white glass is
 * washed out on ink-blue glass, and vice versa. Both sets keep the same hue
 * per category so a category does not appear to change identity when the
 * theme is toggled — only its lightness moves.
 *
 * The set is anchored on the app's icy blue and then walks away through teal,
 * slate, violet and ochre, so neighbouring segments of the ring are always
 * separable — including for the most common colour-vision deficiencies, where
 * they differ in lightness as well as hue.
 */
export const CATEGORY_COLORS_LIGHT: Record<Category, string> = {
  Food: "#1E7FA8",
  Groceries: "#4C9E8F",
  Household: "#6B7F9E",
  Dressing: "#A874A8",
  Beauty: "#E0A07C",
  Skincare: "#7FBBD9",
  Transport: "#C79A3E",
  Fuel: "#8C6B4F",
  "Tea & Coffee": "#B98A5E",
  Culture: "#7A72C4",
  "Books & Subscription": "#5B8FD1",
  Therapy: "#C56D6D",
  Gift: "#A9814E",
  Electronics: "#55707E",
  Trip: "#2FA8A0",
  Miscellaneous: "#8E9AA3",
};

export const CATEGORY_COLORS_DARK: Record<Category, string> = {
  Food: "#5CC3EC",
  Groceries: "#7FD0BE",
  Household: "#9FB3CE",
  Dressing: "#D9A2D9",
  Beauty: "#F0BC9E",
  Skincare: "#A9D9F0",
  Transport: "#E8C069",
  Fuel: "#C7A582",
  "Tea & Coffee": "#DDB98A",
  Culture: "#A79BEC",
  "Books & Subscription": "#8FB2E8",
  Therapy: "#EC9898",
  Gift: "#D2AA76",
  Electronics: "#8AA6B4",
  Trip: "#5CD3C9",
  Miscellaneous: "#AEBAC4",
};

export function categoryColor(category: Category, dark: boolean): string {
  const map = dark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT;
  return map[category] ?? (dark ? "#AEBAC4" : "#8E9AA3");
}

/**
 * Chart colours for trip categories, on the same anchor-and-walk scheme as
 * the main category palette above but a separate set — the two never share a
 * ring, so there is no need for their hues to line up.
 */
export const TRIP_CATEGORY_COLORS_LIGHT: Record<TripCategory, string> = {
  Travel: "#1E7FA8",
  Stay: "#4C9E8F",
  Transport: "#C79A3E",
  Food: "#A874A8",
  Dress: "#E0A07C",
  "Accessories & Toiletries": "#7FBBD9",
  Souvenirs: "#7A72C4",
  Activities: "#C56D6D",
  Others: "#8E9AA3",
};

export const TRIP_CATEGORY_COLORS_DARK: Record<TripCategory, string> = {
  Travel: "#5CC3EC",
  Stay: "#7FD0BE",
  Transport: "#E8C069",
  Food: "#D9A2D9",
  Dress: "#F0BC9E",
  "Accessories & Toiletries": "#A9D9F0",
  Souvenirs: "#A79BEC",
  Activities: "#EC9898",
  Others: "#AEBAC4",
};

export function tripCategoryColor(category: TripCategory, dark: boolean): string {
  const map = dark ? TRIP_CATEGORY_COLORS_DARK : TRIP_CATEGORY_COLORS_LIGHT;
  return map[category] ?? (dark ? "#AEBAC4" : "#8E9AA3");
}
