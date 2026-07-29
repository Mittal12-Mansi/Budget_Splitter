export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrency(amount: number, currency = "INR"): string {
  if (currency === "INR") return formatINR(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export const PERSONAL_CATEGORIES = [
  { label: "Food & Dining", value: "Food", icon: "🍽️" },
  { label: "Transport", value: "Transport", icon: "🚗" },
  { label: "Shopping", value: "Shopping", icon: "🛍️" },
  { label: "Entertainment", value: "Entertainment", icon: "🎬" },
  { label: "Health", value: "Health", icon: "🏥" },
  { label: "Bills & Utilities", value: "Bills", icon: "💡" },
  { label: "Education", value: "Education", icon: "📚" },
  { label: "Travel", value: "Travel", icon: "✈️" },
  { label: "Other", value: "Other", icon: "📦" },
];

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f97316",
  Transport: "#3b82f6",
  Shopping: "#a855f7",
  Entertainment: "#ec4899",
  Health: "#22c55e",
  Bills: "#eab308",
  Education: "#06b6d4",
  Travel: "#14b8a6",
  Other: "#94a3b8",
};
