export const FINANCIAL_TABS = [
  "overview",
  "contributors",
  "eligibility",
  "invitation_queue",
  "payments",
  "expenses",
  "reminders",
  "pledge_links",
  "reports",
  "settings",
] as const;

export type FinancialTab = (typeof FINANCIAL_TABS)[number];

export function isFinancialTab(value: unknown): value is FinancialTab {
  return (
    typeof value === "string" &&
    FINANCIAL_TABS.includes(value as FinancialTab)
  );
}
