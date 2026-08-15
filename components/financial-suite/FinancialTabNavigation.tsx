"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FINANCIAL_TABS, type FinancialTab } from "@/lib/financialTabs";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import type { TranslationKey } from "@/lib/i18n/translations";

const labels: Record<FinancialTab, TranslationKey> = {
  overview: "financial.overview", contributors: "financial.contributors", eligibility: "financial.eligibility", invitation_queue: "financial.invitationQueue", payments: "financial.payments", expenses: "financial.expenses", reminders: "financial.reminders", pledge_links: "financial.pledgeLinks", reports: "financial.reports", settings: "financial.settings",
};

export default function FinancialTabNavigation({active,onChange}:{active:FinancialTab;onChange:(tab:FinancialTab)=>void}) {
  const { t } = useAppLanguage();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateFades = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateFades();
    window.addEventListener("resize", updateFades);
    return () => window.removeEventListener("resize", updateFades);
  }, [updateFades]);

  // The active tab can change the bar's content width (e.g. a longer label),
  // which can flip whether either edge is scrollable -- recheck after it moves.
  useEffect(() => { updateFades(); }, [active, updateFades]);

  return <nav aria-label={t("financial.navigationLabel")} className="sticky top-0 z-20">
    <div
      ref={scrollerRef}
      onScroll={updateFades}
      onWheel={(event) => {
        if (event.deltaY === 0 || event.deltaX !== 0) return;
        const el = scrollerRef.current;
        if (!el) return;
        el.scrollLeft += event.deltaY;
      }}
      className="overflow-x-auto rounded-2xl border border-[#e7e1d7] bg-white p-1.5 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex min-w-max gap-1">
        {FINANCIAL_TABS.map(tab=><button key={tab} type="button" onClick={()=>onChange(tab)} aria-current={active===tab?"page":undefined} className={`min-h-11 whitespace-nowrap rounded-xl px-3.5 text-[15px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${active===tab?"bg-slate-900 text-white shadow-sm":"text-slate-600 hover:bg-stone-100 hover:text-slate-950"}`}>{t(labels[tab])}</button>)}
      </div>
    </div>
    {canScrollLeft && <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-2xl bg-gradient-to-r from-white to-transparent" />}
    {canScrollRight && <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-2xl bg-gradient-to-l from-white to-transparent" />}
  </nav>;
}
