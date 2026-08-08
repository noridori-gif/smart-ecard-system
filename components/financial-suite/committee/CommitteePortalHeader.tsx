"use client";

import { committeeTheme } from "./theme";

type TabKey =
  | "overview"
  | "contributors"
  | "payments"
  | "messages"
  | "reports";

export function CommitteePortalHeader({
  portalLabel,
  eventTitle,
  eventDate,
  language,
  collectedLabel,
  collected,
  pledged,
  percentage,
  activeTab,
  onLanguage,
}: {
  portalLabel: string;
  eventTitle: string;
  eventDate: string;
  language: "sw" | "en";
  collectedLabel: string;
  collected: string;
  pledged: string;
  percentage: number;
  activeTab: TabKey;
  onLanguage: (tab: TabKey, language: "sw" | "en") => void;
}) {
  const ringValue = Math.max(0, Math.min(100, percentage));
  return (
    <header className={`${committeeTheme.header} px-3 pb-3 pt-4 text-white sm:px-5`}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-400">
              Smart Event Pass · {portalLabel}
            </p>
            <h1 className="mt-1 break-words font-serif text-[23px] font-bold leading-tight">
              {eventTitle}
            </h1>
            <p className="mt-1 text-sm text-slate-300">{eventDate}</p>
          </div>
          <div
            className="flex shrink-0 rounded-xl border border-white/15 bg-black/15 p-1"
            aria-label={language === "sw" ? "Chagua lugha" : "Choose language"}
          >
            {(["sw", "en"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onLanguage(activeTab, value)}
                className={`min-h-11 min-w-11 rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  language === value
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-200 hover:bg-white/10"
                }`}
                aria-pressed={language === value}
              >
                {value.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <section
          className={`mt-4 flex items-center gap-4 rounded-[20px] border p-3.5 ${committeeTheme.headerCard}`}
          aria-label={collectedLabel}
        >
          <div
            className="grid h-[74px] w-[74px] shrink-0 place-items-center rounded-full"
            style={{
              background: `conic-gradient(#34d399 ${ringValue * 3.6}deg, #334155 0deg)`,
            }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ringValue)}
          >
            <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-[#17232f]">
              <span className="text-lg font-bold">{Math.round(ringValue)}%</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-slate-300">
              {collectedLabel}
            </p>
            <p className="mt-0.5 break-words text-[19px] font-bold leading-tight text-white">
              {collected}
            </p>
            <p className="mt-1 break-words text-sm text-emerald-300">
              / {pledged}
            </p>
          </div>
        </section>
      </div>
    </header>
  );
}

export function CommitteeTabNavigation({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ key: TabKey; label: string }>;
  active: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <nav className="sticky top-0 z-30 bg-[#101923] px-3 pb-3 sm:px-5">
      <div className="mx-auto max-w-6xl overflow-x-auto rounded-2xl bg-[#1b2835] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`min-h-11 rounded-xl px-4 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                active === tab.key
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
              aria-current={active === tab.key ? "page" : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
