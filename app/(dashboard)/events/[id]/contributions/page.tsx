import FinancialSuiteDashboard from "@/components/financial-suite/FinancialSuiteDashboard";
import { isFinancialTab } from "@/lib/financialTabs";

type ContributionsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function ContributionsPage({
  params,
  searchParams,
}: ContributionsPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const rawTab = resolvedSearchParams.tab;
  const requestedTab = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const initialTab = isFinancialTab(requestedTab) ? requestedTab : "overview";

  return <FinancialSuiteDashboard eventId={id} initialTab={initialTab} />;
}
