import FinancialSuiteDashboard from "@/components/financial-suite/FinancialSuiteDashboard";

export default function ContributionsPage(props: { params: Promise<{ id: string }> }) {
  return <FinancialSuiteDashboard params={props.params} />;
}
