import type { Metadata } from "next";
import Link from "next/link";

import QrVisual from "@/components/ui/QrVisual";
import EventCostEstimator from "@/components/marketing/EventCostEstimator";
import { canonicalAppUrl } from "@/lib/publicPledgeMetadata";

const homeTitle = "Smart Event Pass — Mialiko ya Harusi & Matukio Tanzania";
const homeDescription =
  "Digital wedding & event invitations, RSVP, QR check-in and online pledge tracking for Tanzania. Mfumo wa mialiko ya harusi, RSVP na michango ya harusi mtandaoni.";

export const metadata: Metadata = {
  title: { absolute: homeTitle },
  description: homeDescription,
  alternates: { canonical: canonicalAppUrl() },
  robots: { index: true, follow: true },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    url: canonicalAppUrl(),
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Smart Event Pass — Tanzania's digital event and wedding guest management platform",
      },
    ],
  },
  twitter: {
    title: homeTitle,
    description: homeDescription,
    images: ["/opengraph-image"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${canonicalAppUrl()}/#organization`,
      name: "Smart Event Pass",
      url: canonicalAppUrl(),
      description: homeDescription,
      logo: {
        "@type": "ImageObject",
        url: `${canonicalAppUrl()}/logo.png`,
        width: 1254,
        height: 1254,
      },
      address: {
        "@type": "PostalAddress",
        addressLocality: "Dar es Salaam",
        addressRegion: "Ubungo",
        addressCountry: "TZ",
      },
      areaServed: "TZ",
    },
    {
      "@type": "SoftwareApplication",
      name: "Smart Event Pass",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: canonicalAppUrl(),
      description: homeDescription,
      provider: { "@id": `${canonicalAppUrl()}/#organization` },
      areaServed: "TZ",
      inLanguage: ["en", "sw"],
    },
  ],
};

type Feature = { title: string; description: string; icon: string; flagship?: boolean };
type FeatureGroup = { title: string; features: Feature[] };

const featureGroups: FeatureGroup[] = [
  {
    title: "Guest Experience",
    features: [
      {
        title: "Beautiful Invitations",
        description:
          "Create elegant digital invitations with event photos, countdowns, RSVP and personal guest links.",
        icon: "💌",
        flagship: true,
      },
      {
        title: "Smart QR Check-In",
        description:
          "Generate a unique QR pass for every guest and verify attendance quickly at the entrance.",
        icon: "📱",
      },
      {
        title: "Guest Management",
        description:
          "Add, edit, organize and track guests, categories, RSVP responses and check-in status.",
        icon: "👥",
      },
      {
        title: "WhatsApp Sharing",
        description:
          "Send each guest a personal invitation link directly through WhatsApp in just one click.",
        icon: "💬",
      },
      {
        title: "Live Attendance",
        description:
          "Monitor checked-in guests, pending arrivals and attendance progress from one dashboard.",
        icon: "📊",
      },
    ],
  },
  {
    title: "Financial Management",
    features: [
      {
        title: "Pledges & Contributions",
        description:
          "Track per-guest pledges and partial payments, and monitor collection progress and remaining balances in real time.",
        icon: "💳",
        flagship: true,
      },
      {
        title: "Expense Tracking",
        description:
          "Record event expenses by category, compare actual spend against budgets, and see remaining budget at a glance.",
        icon: "🧾",
      },
      {
        title: "Financial Reports & Closing",
        description:
          "Generate closing reports with full transaction logs, and export payment and expense workbooks for reconciliation.",
        icon: "📈",
      },
      {
        title: "Automated Reminders & Receipts",
        description:
          "Send automated SMS and WhatsApp payment reminders and thank-you receipts to contributors.",
        icon: "🔔",
      },
    ],
  },
  {
    title: "Event Operations",
    features: [
      {
        title: "Automation Center",
        description:
          "Connect WhatsApp, SMS and Make.com to automate invitations, reminders and workflow triggers end-to-end.",
        icon: "⚙️",
        flagship: true,
      },
      {
        title: "Committee Portal",
        description:
          "Give committee members their own scoped view to collaborate on contributions and expenses.",
        icon: "🧑‍🤝‍🧑",
      },
      {
        title: "Multiple Event Types",
        description:
          "Use the platform for weddings, send-offs, birthdays, graduations and corporate events.",
        icon: "🎉",
      },
    ],
  },
];

type TrustSignal = { icon: string; en: string; sw: string };

const trustSignals: TrustSignal[] = [
  { icon: "🔒", en: "Secure payment tracking", sw: "Ufuatiliaji salama wa malipo" },
  { icon: "📱", en: "Mobile Money & Bank support", sw: "Inasaidia M-Pesa, Airtel Money, na benki" },
  { icon: "🇹🇿", en: "Built for Tanzanian events", sw: "Imetengenezwa kwa ajili ya matukio ya Tanzania" },
  { icon: "✅", en: "WhatsApp & SMS notifications", sw: "Arifa za WhatsApp na SMS" },
];

const journeyStatuses = [
  { label: "Invitation Delivered", detail: "WhatsApp · 10:41", color: "bg-teal-400", ring: "ring-teal-400/25" },
  { label: "RSVP Confirmed", detail: "2 guests · 10:44", color: "bg-emerald-300", ring: "ring-emerald-300/25" },
  { label: "Pass Generated", detail: "VIP access · 10:44", color: "bg-emerald-400", ring: "ring-emerald-400/25" },
  { label: "Check-in Verified", detail: "Gate A · Just now", color: "bg-emerald-500", ring: "ring-emerald-500/30" },
];

function LiveGuestJourney() {
  return (
    <div className="relative mx-auto w-full max-w-[34rem] lg:ml-auto">
      <div className="absolute inset-x-8 -bottom-4 top-10 rounded-[2rem] bg-emerald-500/10 blur-2xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-600/45 bg-slate-900/80 p-3 shadow-[0_28px_80px_rgba(2,8,23,.52)] backdrop-blur-xl sm:p-4">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(45,212,191,.08),transparent_38%,rgba(16,185,129,.05))]" aria-hidden="true" />

        <div className="relative rounded-[1.35rem] border border-white/10 bg-[#071426]/90 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.34em] text-teal-300">Live Guest Journey</p>
              <h2 className="mt-2 text-lg font-semibold text-white sm:text-xl">Newton Ludovick</h2>
              <p className="mt-1 text-xs text-slate-400">Invitation opened · 10:42</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Live
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(190px,.9fr)]">
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="absolute bottom-7 left-[1.18rem] top-8 w-px bg-gradient-to-b from-teal-400/60 via-emerald-300/50 to-emerald-500/60" aria-hidden="true" />
              <ol className="relative space-y-4">
                {journeyStatuses.map((status, index) => (
                  <li key={status.label} className="flex items-center gap-3">
                    <span className={`relative z-10 flex h-3 w-3 shrink-0 rounded-full ${status.color} ring-4 ${status.ring} ${index === journeyStatuses.length - 1 ? "journey-success-pulse" : ""}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${index === journeyStatuses.length - 1 ? "text-emerald-300" : "text-slate-100"}`}>{status.label}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{status.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-emerald-300/20 bg-gradient-to-b from-slate-800/90 to-slate-900 p-3">
              <div className="flex items-center justify-between gap-2">
                <div><p className="text-[8px] font-bold uppercase tracking-[0.22em] text-emerald-300">Secure Event Pass</p><p className="mt-1 font-mono text-xs font-bold text-white">8F42KD</p></div>
                <span className="rounded border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-[9px] font-bold text-amber-200">VIP</span>
              </div>
              <div className="relative mx-auto mt-3 aspect-square w-[7.25rem] overflow-hidden rounded-xl border border-white/15 bg-white p-1.5 shadow-[0_10px_25px_rgba(0,0,0,.25)] sm:w-[8rem]">
                <QrVisual />
                <span className="journey-scan absolute inset-x-1.5 top-1.5 h-px bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.9)]" aria-hidden="true" />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[9px]"><span className="text-slate-400">Admission</span><span className="font-semibold text-white">2 Guests</span></div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ["WhatsApp", "Delivered", "text-teal-300"],
              ["Secure", "Access", "text-emerald-300"],
              ["Live", "Verification", "text-emerald-400"],
            ].map(([top, bottom, color]) => (
              <div key={top} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] px-1.5 py-2.5">
                <p className={`truncate text-[8px] font-bold uppercase tracking-[0.12em] ${color}`}>{top}</p>
                <p className="mt-1 truncate text-[9px] text-slate-300">{bottom}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes journey-scan {
          0%, 12% { transform: translateY(0); opacity: 0; }
          22% { opacity: 0.9; }
          72% { transform: translateY(104px); opacity: 0.9; }
          82%, 100% { transform: translateY(104px); opacity: 0; }
        }
        @keyframes journey-success-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
          50% { box-shadow: 0 0 0 7px rgba(52, 211, 153, 0.14); }
        }
        .journey-scan { animation: journey-scan 3.8s ease-in-out infinite; }
        .journey-success-pulse { animation: journey-success-pulse 2.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .journey-scan, .journey-success-pulse { animation: none; }
          .journey-scan { top: 50%; opacity: 0.55; }
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950" />

        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-8 sm:px-8 lg:px-12">
          <nav className="flex items-center justify-between">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight sm:text-2xl"
            >
              Smart Event Pass
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Login
            </Link>
          </nav>

          <div className="grid items-center gap-10 pb-8 pt-14 md:grid-cols-[minmax(0,.9fr)_minmax(350px,1.1fr)] md:gap-8 md:pt-20 lg:grid-cols-2 lg:gap-14 lg:pt-28">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                Digital invitations. Smart access. Better events.
              </div>

              <h1 className="mt-7 max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                Make every guest feel
                <span className="block bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 bg-clip-text text-transparent">
                  truly invited.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                Create personalized invitations, collect RSVP responses, issue
                secure QR passes and verify every guest at the entrance.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-7 py-4 text-base font-bold text-white shadow-lg shadow-emerald-700/25 transition hover:bg-emerald-600"
                >
                  Open Admin Dashboard
                </Link>

                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-7 py-4 text-base font-bold text-white transition hover:bg-white/10"
                >
                  Explore Features
                </a>
              </div>

              <div className="mt-10 hidden max-w-xl grid-cols-3 gap-4 sm:grid">
                <div>
                  <p className="text-2xl font-bold text-white">1 Link</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Personal invitation
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-bold text-white">1 QR</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Secure event pass
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-bold text-white">1 System</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Complete guest journey
                  </p>
                </div>
              </div>
            </div>

            <LiveGuestJourney />
          </div>
        </div>
      </section>

      <section
        id="features"
        className="bg-slate-100 px-6 py-24 text-slate-900 sm:px-8 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-700">
              Complete Event Experience
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Everything you need to manage guests beautifully
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              From the first invitation message to the final check-in at the
              entrance, Smart Event Pass keeps the whole guest journey in one
              place.
            </p>
          </div>

          <div className="mt-14 space-y-14">
            {featureGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-700">
                  {group.title}
                </h3>

                <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {group.features.map((feature) => (
                    <div
                      key={feature.title}
                      className={`rounded-2xl border border-[#e7e1d7] p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                        feature.flagship
                          ? "bg-gradient-to-br from-emerald-50 to-white md:col-span-2 xl:col-span-2"
                          : "bg-white"
                      }`}
                    >
                      <div className={feature.flagship ? "text-5xl" : "text-4xl"}>
                        {feature.icon}
                      </div>

                      <h4
                        className={`mt-5 font-bold text-slate-900 ${
                          feature.flagship ? "text-2xl" : "text-xl"
                        }`}
                      >
                        {feature.title}
                      </h4>

                      <p className="mt-3 leading-7 text-slate-600">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-16 text-slate-900 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-base font-semibold text-slate-700 sm:text-lg">
            Trusted by event organizers across Tanzania
            <span className="mx-2 text-slate-300">·</span>
            Inaaminika na waandaaji wa matukio Tanzania
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {trustSignals.map((signal) => (
              <div
                key={signal.en}
                className="flex flex-col items-center gap-2 rounded-2xl border border-[#e7e1d7] bg-slate-50 px-4 py-6 text-center"
              >
                <span className="text-3xl" aria-hidden="true">
                  {signal.icon}
                </span>
                <p className="text-sm font-bold text-slate-900">{signal.en}</p>
                <p className="text-xs text-slate-500">{signal.sw}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="cost-estimator"
        className="bg-slate-100 px-6 py-24 text-slate-900 sm:px-8 lg:px-12"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-700">
              Plan Your Budget · Panga Bajeti Yako
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Estimate Your Event Costs
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Pick an event type, guest count and venue tier to get a starting
              budget — then adjust every category to match real prices in your
              area. Chagua aina ya tukio, idadi ya wageni na aina ya ukumbi
              kupata makadirio ya awali.
            </p>
          </div>

          <EventCostEstimator />
        </div>
      </section>

      <section className="bg-white px-6 py-24 text-slate-900 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 to-teal-700 px-7 py-14 text-center text-white shadow-xl sm:px-12">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-100">
            Smart Event Pass
          </p>

          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold sm:text-5xl">
            Turn every invitation into a complete digital event experience.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-emerald-100">
            Manage events, guests, RSVP responses, QR passes and check-ins from
            one simple platform.
          </p>

          <Link
            href="/login"
            className="mt-8 inline-flex rounded-xl bg-white px-7 py-4 font-bold text-emerald-700 transition hover:bg-emerald-50"
          >
            Login to Continue
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-slate-950 px-6 py-8 text-center text-sm text-slate-400">
        <p>© 2026 Smart Event Pass. Your invitation. Your moment.</p>
      </footer>
    </main>
  );
}
