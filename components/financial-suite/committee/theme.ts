export const committeeTheme = {
  page: "bg-[#f7f4ed]",
  header: "bg-[#101923]",
  headerCard: "border-white/10 bg-[#17232f]",
  card: "border-[#e8e2d8] bg-white shadow-[0_8px_24px_rgba(39,34,25,0.06)]",
  mutedCard: "border-[#ebe6de] bg-[#faf9f6]",
  primaryButton:
    "bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 focus-visible:ring-emerald-600",
  focus:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
} as const;

export function progressColour(value: number) {
  if (value < 30) return "bg-red-500";
  if (value < 70) return "bg-amber-500";
  return "bg-emerald-600";
}
