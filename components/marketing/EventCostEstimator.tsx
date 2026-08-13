"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatAppTzs } from "@/lib/i18n/formatters";

type EventTypeOption = {
  id: string;
  en: string;
  sw: string;
  cateringPerGuest: number;
  entertainmentBase: number;
  decorPerGuest: number;
  drinksPerGuest: number;
  transportBase: number;
  transportPerGuest: number;
  mcBase: number;
  photographyBase: number;
};

type VenueTierOption = {
  id: string;
  en: string;
  sw: string;
  baseCost: number;
  perGuest: number;
};

const EVENT_TYPES: EventTypeOption[] = [
  {
    id: "wedding", en: "Wedding", sw: "Harusi",
    cateringPerGuest: 25000, entertainmentBase: 1800000, decorPerGuest: 10000,
    drinksPerGuest: 6000, transportBase: 400000, transportPerGuest: 1000, mcBase: 500000, photographyBase: 1200000,
  },
  {
    id: "sendoff", en: "Send-off", sw: "Kupeleka Bibi",
    cateringPerGuest: 20000, entertainmentBase: 1000000, decorPerGuest: 7000,
    drinksPerGuest: 5000, transportBase: 300000, transportPerGuest: 800, mcBase: 350000, photographyBase: 800000,
  },
  {
    id: "birthday", en: "Birthday", sw: "Siku ya Kuzaliwa",
    cateringPerGuest: 15000, entertainmentBase: 600000, decorPerGuest: 5000,
    drinksPerGuest: 4000, transportBase: 200000, transportPerGuest: 600, mcBase: 250000, photographyBase: 500000,
  },
  {
    id: "kitchen_party", en: "Kitchen Party", sw: "Kitchen Party",
    cateringPerGuest: 18000, entertainmentBase: 900000, decorPerGuest: 8000,
    drinksPerGuest: 5000, transportBase: 250000, transportPerGuest: 700, mcBase: 300000, photographyBase: 600000,
  },
];

const VENUE_TIERS: VenueTierOption[] = [
  { id: "basic", en: "Basic Hall", sw: "Ukumbi wa Kawaida", baseCost: 500000, perGuest: 3000 },
  { id: "mid", en: "Mid-range Venue", sw: "Ukumbi wa Kati", baseCost: 1500000, perGuest: 6000 },
  { id: "premium", en: "Premium Venue", sw: "Ukumbi wa Hali ya Juu", baseCost: 4000000, perGuest: 12000 },
];

const MIN_GUESTS = 50;
const MAX_GUESTS = 500;

function roundToNearest(value: number, nearest: number) {
  return Math.round(value / nearest) * nearest;
}

function computeDefaults(eventType: EventTypeOption, venueTier: VenueTierOption, guestCount: number) {
  return {
    venue: roundToNearest(venueTier.baseCost + venueTier.perGuest * guestCount, 10000),
    catering: roundToNearest(eventType.cateringPerGuest * guestCount, 10000),
    entertainment: roundToNearest(eventType.entertainmentBase + guestCount * 400, 10000),
    decorations: roundToNearest(eventType.decorPerGuest * guestCount, 10000),
    // Drinks scale with guest count like catering. Transport scales only lightly
    // (mostly fixed vehicle/logistics cost, not per-head). MC and photography are
    // flat service packages that don't meaningfully change with guest count.
    drinks: roundToNearest(eventType.drinksPerGuest * guestCount, 10000),
    transport: roundToNearest(eventType.transportBase + eventType.transportPerGuest * guestCount, 10000),
    mc: roundToNearest(eventType.mcBase, 10000),
    photography: roundToNearest(eventType.photographyBase, 10000),
  };
}

type CategoryKey = "venue" | "catering" | "entertainment" | "decorations" | "drinks" | "transport" | "mc" | "photography";
const CATEGORY_LABELS: { key: CategoryKey; en: string; sw: string }[] = [
  { key: "venue", en: "Venue", sw: "Ukumbi" },
  { key: "catering", en: "Catering", sw: "Chakula" },
  { key: "entertainment", en: "Entertainment", sw: "Burudani" },
  { key: "decorations", en: "Decorations", sw: "Mapambo" },
  { key: "drinks", en: "Drinks", sw: "Vinywaji" },
  { key: "transport", en: "Transport", sw: "Usafiri" },
  { key: "mc", en: "Emcee (MC)", sw: "MC" },
  { key: "photography", en: "Photography", sw: "Upigaji Picha" },
];

function ToggleChip({ active, onClick, en, sw }: { active: boolean; onClick: () => void; en: string; sw: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-4 py-3 text-left transition ${
        active
          ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
          : "border-[#e7e1d7] bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/60"
      }`}
    >
      <span className="block text-sm font-bold">{en}</span>
      <span className={`block text-xs ${active ? "text-emerald-100" : "text-slate-500"}`}>{sw}</span>
    </button>
  );
}

export default function EventCostEstimator() {
  const [eventTypeId, setEventTypeId] = useState(EVENT_TYPES[0].id);
  const [venueTierId, setVenueTierId] = useState(VENUE_TIERS[1].id);
  const [guestCount, setGuestCount] = useState(150);
  const [values, setValues] = useState(() => computeDefaults(EVENT_TYPES[0], VENUE_TIERS[1], 150));

  useEffect(() => {
    const eventType = EVENT_TYPES.find((option) => option.id === eventTypeId) ?? EVENT_TYPES[0];
    const venueTier = VENUE_TIERS.find((option) => option.id === venueTierId) ?? VENUE_TIERS[1];
    setValues(computeDefaults(eventType, venueTier, guestCount));
  }, [eventTypeId, venueTierId, guestCount]);

  const total =
    values.venue + values.catering + values.entertainment + values.decorations +
    values.drinks + values.transport + values.mc + values.photography;

  function updateCategory(key: CategoryKey, raw: string) {
    const parsed = Number(raw.replace(/[^0-9]/g, ""));
    setValues((current) => ({ ...current, [key]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 }));
  }

  return (
    <div className="mt-14 grid gap-8 lg:grid-cols-2">
      <div className="rounded-2xl border border-[#e7e1d7] bg-white p-7 shadow-sm print:hidden">
        <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-700">Event Type · Aina ya Tukio</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {EVENT_TYPES.map((option) => (
            <ToggleChip key={option.id} active={option.id === eventTypeId} onClick={() => setEventTypeId(option.id)} en={option.en} sw={option.sw} />
          ))}
        </div>

        <h3 className="mt-8 text-sm font-bold uppercase tracking-[0.22em] text-emerald-700">Guest Count · Idadi ya Wageni</h3>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">{MIN_GUESTS}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-800">{guestCount} guests</span>
            <span className="text-slate-500">{MAX_GUESTS}</span>
          </div>
          <input
            type="range"
            min={MIN_GUESTS}
            max={MAX_GUESTS}
            step={10}
            value={guestCount}
            onChange={(event) => setGuestCount(Number(event.target.value))}
            className="mt-2 w-full accent-emerald-700"
            aria-label="Guest count"
          />
        </div>

        <h3 className="mt-8 text-sm font-bold uppercase tracking-[0.22em] text-emerald-700">Venue Type · Aina ya Ukumbi</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {VENUE_TIERS.map((option) => (
            <ToggleChip key={option.id} active={option.id === venueTierId} onClick={() => setVenueTierId(option.id)} en={option.en} sw={option.sw} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#e7e1d7] bg-white p-7 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-700">
          Estimated Budget Breakdown · Muhtasari wa Bajeti
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_LABELS.map(({ key, en, sw }) => (
            <div key={key} className="rounded-lg border border-[#eee9e1] bg-[#faf8f4] px-3 py-2">
              <p className="truncate text-xs font-bold text-slate-800">{en}</p>
              <p className="truncate text-[11px] text-slate-500">{sw}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400">TSh</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={values[key].toLocaleString("en-US")}
                  onChange={(event) => updateCategory(key, event.target.value)}
                  className="w-full min-w-0 rounded-md border border-[#e7e1d7] px-1.5 py-1 text-right text-xs font-bold text-slate-900 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 print:border-none"
                  aria-label={`${en} cost`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-700 px-4 py-4 text-white">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em]">Total Estimated Cost</p>
            <p className="text-xs text-emerald-100">Jumla ya Gharama Inayokadiriwa</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{formatAppTzs(total, "en")}</p>
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          These are starting estimates — adjust them to match your local market prices.
          <br />
          Haya ni makadirio ya awali tu — unaweza kuyabadilisha kulingana na bei za soko lako.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row print:hidden">
          <Link
            href="/login"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-700 px-6 py-4 text-center text-base font-bold text-white shadow-lg shadow-emerald-700/25 transition hover:bg-emerald-600"
          >
            <span>
              Anza Kufuatilia Bajeti Hii Sasa
              <span className="block text-xs font-semibold text-emerald-100">Start tracking this budget now</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center rounded-xl border border-[#e7e1d7] bg-white px-6 py-4 text-sm font-bold text-slate-600 transition hover:bg-stone-50"
          >
            Save as PDF · Hifadhi kama PDF
          </button>
        </div>
      </div>
    </div>
  );
}
