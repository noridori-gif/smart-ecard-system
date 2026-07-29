"use client";

import { FINANCIAL_TABS, type FinancialTab } from "@/lib/financialTabs";

const labels: Record<FinancialTab, string> = {
  overview: "Overview",
  contributors: "Contributors",
  payments: "Payments",
  reminders: "Reminders",
  reports: "Reports",
  settings: "Settings",
};

export default function FinancialTabNavigation({active,onChange}:{active:FinancialTab;onChange:(tab:FinancialTab)=>void}) {
  return <nav aria-label="Financial Suite sections" className="sticky top-0 z-20 -mx-1 overflow-x-auto border-b border-slate-200 bg-slate-50/95 px-1 backdrop-blur">
    <div className="flex min-w-max gap-1">
      {FINANCIAL_TABS.map(tab=><button key={tab} type="button" onClick={()=>onChange(tab)} aria-current={active===tab?"page":undefined} className={`min-h-11 border-b-2 px-4 text-sm font-semibold transition ${active===tab?"border-emerald-600 text-emerald-700":"border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}>{labels[tab]}</button>)}
    </div>
  </nav>;
}
