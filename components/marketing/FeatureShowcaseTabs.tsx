"use client";

import { useState } from "react";

type Feature = { title: string; description: string; icon: string; flagship?: boolean };
type FeatureGroup = { title: string; features: Feature[] };

export default function FeatureShowcaseTabs({ groups }: { groups: FeatureGroup[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeGroup = groups[activeIndex];

  return (
    <div className="mt-14">
      <div role="tablist" aria-label="Feature categories" className="flex flex-wrap justify-center gap-2">
        {groups.map((group, index) => (
          <button
            key={group.title}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            onClick={() => setActiveIndex(index)}
            className={`rounded-full border px-5 py-2.5 text-sm font-bold transition ${
              index === activeIndex
                ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                : "border-[#e7e1d7] bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
            }`}
          >
            {group.title}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {activeGroup.features.map((feature) => (
          <div
            key={feature.title}
            className={`rounded-2xl border border-[#e7e1d7] p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
              feature.flagship
                ? "bg-gradient-to-br from-emerald-50 to-white md:col-span-2 xl:col-span-2"
                : "bg-white"
            }`}
          >
            <div className={feature.flagship ? "text-5xl" : "text-4xl"}>{feature.icon}</div>

            <h4 className={`mt-5 font-bold text-slate-900 ${feature.flagship ? "text-2xl" : "text-xl"}`}>
              {feature.title}
            </h4>

            <p className="mt-3 leading-7 text-slate-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
