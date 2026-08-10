"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getCurrentUserProfile } from "@/services/profileService";

const templates = [
  ["royal_portrait", "Royal Portrait"],
  ["golden_elegance", "Golden Elegance"],
  ["botanical_romance", "Botanical Romance"],
  ["modern_minimal_photo", "Modern Minimal Photo"],
  ["heritage_pattern", "Heritage Pattern"],
] as const;

export default function WhatsAppCardPreviewPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(() => Date.now());

  useEffect(() => {
    let isMounted = true;

    async function authorize() {
      try {
        const profile = await getCurrentUserProfile();

        if (!profile) {
          router.replace("/login");
          return;
        }

        if (
          !profile.is_active ||
          (profile.role !== "admin" && profile.role !== "organizer")
        ) {
          router.replace("/dashboard");
          return;
        }

        if (isMounted) setIsAuthorized(true);
      } catch (error) {
        console.error("WhatsApp card preview authorization error:", error);
        router.replace("/dashboard");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    authorize();
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading || !isAuthorized) {
    return (
      <div className="rounded-2xl border border-[#e7e1d7] bg-white p-8 text-sm text-slate-600 shadow-sm">
        Loading WhatsApp card preview…
      </div>
    );
  }

  return (
    <section>
      <div className="flex flex-col gap-4 rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            5 Premium Designs • Real WhatsApp Card Preview
          </p>
          <h1 className="sep-page-title mt-1">
            WhatsApp Invitation Card Review
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Every preview below is a real 1080 × 1800 V4 PNG from the production card renderer. No WhatsApp or Meta API is called.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey(Date.now())}
          className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
        >
          Refresh PNGs
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {templates.map(([template, label]) => (
          <article
            key={template}
            className="overflow-hidden rounded-2xl border border-[#e7e1d7] bg-white shadow-sm"
          >
            <div className="border-b border-[#e7e1d7] px-5 py-4">
              <h2 className="font-bold text-slate-900">{label}</h2>
              <p className="mt-1 font-mono text-xs text-slate-500">{template}</p>
            </div>
            <div className="bg-slate-100 p-3 sm:p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/whatsapp-card-preview/${template}?v=${refreshKey}`}
                alt={`${label} WhatsApp invitation card preview`}
                width={1080}
                height={1800}
                className="h-auto w-full rounded-lg shadow-lg"
              />
              <div className="mx-auto mt-4 max-w-xl rounded-2xl bg-[#efeae2] p-3 shadow-inner sm:p-5">
                <div className="ml-auto max-w-[94%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-4 py-3 text-[15px] leading-6 text-slate-800 shadow-sm">
                  <p>
                    Habari <strong>Mr &amp; Mrs Noriega Ludovick</strong>,
                  </p>
                  <p className="mt-3">
                    Unakaribishwa kwenye harusi ya
                    <strong className="block">Samwel &amp; Dio</strong>
                  </p>
                  <div className="mt-3">
                    <p>📅 Tarehe: 12 Septemba 2026</p>
                    <p>🕒 Muda: Saa 2:00 Asubuhi</p>
                    <p>📍 Mahali: Noble Hall Kimara, Dar es Salaam</p>
                  </div>
                  <div className="mt-3">
                    <p>
                      🎫 Event Pass ID: <strong>8F42KD</strong>
                    </p>
                    <p>
                      👥 Idadi ya Wageni: <strong>2</strong>
                    </p>
                  </div>
                  <p className="mt-3">
                    Tafadhali thibitisha mahudhurio yako kwa kutumia vitufe
                    vilivyo hapa chini.
                  </p>
                  <p className="mt-3">Asante sana.</p>
                  <p className="mt-1 text-right text-[11px] text-slate-500">
                    10:24 ✓✓
                  </p>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="min-h-12 rounded-xl bg-white px-2 py-2 text-sm font-semibold text-[#027eb5] shadow-sm"
                  >
                    Nitafika
                  </button>
                  <button
                    type="button"
                    className="min-h-12 rounded-xl bg-white px-2 py-2 text-sm font-semibold text-[#027eb5] shadow-sm"
                  >
                    Sitafika
                  </button>
                  <button
                    type="button"
                    className="min-h-12 rounded-xl bg-white px-2 py-2 text-sm font-semibold text-[#027eb5] shadow-sm"
                  >
                    📍 View Location
                  </button>
                  <button
                    type="button"
                    className="min-h-12 rounded-xl bg-white px-2 py-2 text-sm font-semibold text-[#027eb5] shadow-sm"
                  >
                    🔗 Fungua Mwaliko
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <article className="mt-8 overflow-hidden rounded-2xl border border-[#e7e1d7] bg-white shadow-sm">
        <div className="border-b border-[#e7e1d7] px-5 py-4">
          <h2 className="font-bold text-slate-900">Compact Horizontal</h2>
          <p className="mt-1 text-sm text-slate-500">
            WhatsApp-friendly landscape option with a photo-ready emerald panel.
          </p>
        </div>
        <div className="bg-slate-100 p-3 sm:p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/whatsapp-card-preview/compact_horizontal?v=${refreshKey}`}
            alt="Compact horizontal WhatsApp invitation card preview"
            width={1080}
            height={520}
            className="h-auto w-full rounded-lg shadow-lg"
          />
        </div>
      </article>
    </section>
  );
}
