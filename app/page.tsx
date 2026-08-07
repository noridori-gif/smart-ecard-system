import Link from "next/link";

const features = [
  {
    title: "Beautiful Invitations",
    description:
      "Create elegant digital invitations with event photos, countdowns, RSVP and personal guest links.",
    icon: "💌",
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
  {
    title: "Multiple Event Types",
    description:
      "Use the platform for weddings, send-offs, birthdays, graduations and corporate events.",
    icon: "🎉",
  },
];

const journeyStatuses = [
  { label: "Invitation Delivered", detail: "WhatsApp · 10:41", color: "bg-cyan-400", ring: "ring-cyan-400/25" },
  { label: "RSVP Confirmed", detail: "2 guests · 10:44", color: "bg-blue-400", ring: "ring-blue-400/25" },
  { label: "Pass Generated", detail: "VIP access · 10:44", color: "bg-indigo-400", ring: "ring-indigo-400/25" },
  { label: "Check-in Verified", detail: "Gate A · Just now", color: "bg-emerald-400", ring: "ring-emerald-400/30" },
];

function QrVisual() {
  return (
    <svg viewBox="0 0 116 116" className="h-full w-full" role="img" aria-label="Secure event pass QR code">
      <rect width="116" height="116" rx="8" fill="white" />
      <g fill="#071426">
        <path d="M9 9h30v30H9zm6 6v18h18V15zm4 4h10v10H19zM77 9h30v30H77zm6 6v18h18V15zm4 4h10v10H87zM9 77h30v30H9zm6 6v18h18V83zm4 4h10v10H19z" />
        <path d="M47 9h8v8h-8zm12 0h8v8h-8zM43 21h8v8h-8zm12 0h16v8H55zM47 33h8v8h-8zm12 0h8v8h-8zM43 47h8v8h-8zm12 0h8v8h-8zm12 0h12v8H67zm16 0h8v8h-8zm12 0h12v8H95zM9 47h8v8H9zm12 0h16v8H21zM9 59h12v8H9zm16 0h8v8h-8zm12 0h8v8h-8zm12 0h16v8H49zm20 0h8v8h-8zm12 0h8v8h-8zm12 0h12v8H93zM47 71h8v8h-8zm12 0h8v8h-8zm12 0h16v8H71zm20 0h16v8H91zM43 83h8v8h-8zm12 0h16v8H55zm20 0h8v8h-8zm12 0h8v8h-8zm12 0h8v8h-8zM47 95h8v8h-8zm12 0h8v8h-8zm12 0h8v8h-8zm12 0h12v8H83zm16 0h8v8h-8z" />
      </g>
    </svg>
  );
}

function LiveGuestJourney() {
  return (
    <div className="relative mx-auto w-full max-w-[34rem] lg:ml-auto">
      <div className="absolute inset-x-8 -bottom-4 top-10 rounded-[2rem] bg-blue-500/10 blur-2xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-600/45 bg-slate-900/80 p-3 shadow-[0_28px_80px_rgba(2,8,23,.52)] backdrop-blur-xl sm:p-4">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(56,189,248,.08),transparent_38%,rgba(16,185,129,.05))]" aria-hidden="true" />

        <div className="relative rounded-[1.35rem] border border-white/10 bg-[#071426]/90 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.34em] text-cyan-300">Live Guest Journey</p>
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
              <div className="absolute bottom-7 left-[1.18rem] top-8 w-px bg-gradient-to-b from-cyan-400/60 via-blue-400/50 to-emerald-400/60" aria-hidden="true" />
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

            <div className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-gradient-to-b from-slate-800/90 to-slate-900 p-3">
              <div className="flex items-center justify-between gap-2">
                <div><p className="text-[8px] font-bold uppercase tracking-[0.22em] text-cyan-300">Secure Event Pass</p><p className="mt-1 font-mono text-xs font-bold text-white">8F42KD</p></div>
                <span className="rounded border border-indigo-300/25 bg-indigo-400/10 px-2 py-1 text-[9px] font-bold text-indigo-200">VIP</span>
              </div>
              <div className="relative mx-auto mt-3 aspect-square w-[7.25rem] overflow-hidden rounded-xl border border-white/15 bg-white p-1.5 shadow-[0_10px_25px_rgba(0,0,0,.25)] sm:w-[8rem]">
                <QrVisual />
                <span className="journey-scan absolute inset-x-1.5 top-1.5 h-px bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,.9)]" aria-hidden="true" />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[9px]"><span className="text-slate-400">Admission</span><span className="font-semibold text-white">2 Guests</span></div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ["WhatsApp", "Delivered", "text-cyan-300"],
              ["Secure", "Access", "text-blue-300"],
              ["Live", "Verification", "text-emerald-300"],
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-indigo-950" />

        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

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
              Admin Login
            </Link>
          </nav>

          <div className="grid items-center gap-10 pb-8 pt-14 md:grid-cols-[minmax(0,.9fr)_minmax(350px,1.1fr)] md:gap-8 md:pt-20 lg:grid-cols-2 lg:gap-14 lg:pt-28">
            <div>
              <div className="inline-flex rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-200">
                Digital invitations. Smart access. Better events.
              </div>

              <h1 className="mt-7 max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                Make every guest feel
                <span className="block bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
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
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-7 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500"
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
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-700">
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

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-4xl">{feature.icon}</div>

                <h3 className="mt-5 text-xl font-bold text-slate-900">
                  {feature.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-24 text-slate-900 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 px-7 py-14 text-center text-white shadow-xl sm:px-12">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-100">
            Smart Event Pass
          </p>

          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold sm:text-5xl">
            Turn every invitation into a complete digital event experience.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">
            Manage events, guests, RSVP responses, QR passes and check-ins from
            one simple platform.
          </p>

          <Link
            href="/login"
            className="mt-8 inline-flex rounded-xl bg-white px-7 py-4 font-bold text-blue-700 transition hover:bg-blue-50"
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
