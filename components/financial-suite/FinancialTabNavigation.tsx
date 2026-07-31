"use client";

import { FINANCIAL_TABS, type FinancialTab } from "@/lib/financialTabs";

const labels: Record<FinancialTab, string> = {
  overview: "Muhtasari",
  contributors: "Wachangiaji",
  eligibility: "Ustahiki",
  invitation_queue: "Wanaosubiri Mwaliko",
  payments: "Malipo",
  reminders: "Vikumbusho",
  reports: "Taarifa",
  settings: "Mipangilio",
};

export default function FinancialTabNavigation({active,onChange}:{active:FinancialTab;onChange:(tab:FinancialTab)=>void}) {
  return <nav aria-label="Sehemu za mfumo wa fedha" className="sticky top-0 z-20 overflow-x-auto rounded-2xl border border-[#e7e1d7] bg-white p-1.5 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div className="flex min-w-max gap-1">
      {FINANCIAL_TABS.map(tab=><button key={tab} type="button" onClick={()=>onChange(tab)} aria-current={active===tab?"page":undefined} className={`min-h-11 rounded-xl px-4 text-[15px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 ${active===tab?"bg-slate-900 text-white shadow-sm":"text-slate-600 hover:bg-stone-100 hover:text-slate-950"}`}>{labels[tab]}</button>)}
    </div>
  </nav>;
}
