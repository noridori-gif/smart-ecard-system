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

          <div className="grid items-center gap-14 pb-8 pt-20 lg:grid-cols-2 lg:pt-28">
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
                Smart Event Pass helps organizers create beautiful digital
                invitations, manage guests, collect RSVP responses and verify
                entry using secure QR codes.
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

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
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

            <div className="relative mx-auto w-full max-w-lg">
              <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-2xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
                <div className="rounded-3xl bg-white p-5 text-slate-900">
                  <div className="rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 px-6 py-10 text-center text-white">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/90">
                      You Are Invited
                    </p>

                    <div className="mt-4 text-4xl">💍</div>

                    <h2 className="mt-4 text-3xl font-bold">
                      Aron & Annabel
                    </h2>

                    <p className="mt-2 text-white/90">
                      Wedding Celebration
                    </p>
                  </div>

                  <div className="px-3 py-6">
                    <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                      Special Invitation For
                    </p>

                    <p className="mt-2 text-center text-2xl font-bold text-rose-700">
                      Mr & Mrs Noriega
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-rose-50 p-4 text-center">
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Date
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          15 July 2026
                        </p>
                      </div>

                      <div className="rounded-xl bg-rose-50 p-4 text-center">
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Time
                        </p>
                        <p className="mt-1 text-sm font-semibold">18:00</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-rose-50 p-4 text-center">
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Venue
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        Mlimani City
                      </p>
                    </div>

                    <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                      <p className="text-sm font-bold text-emerald-700">
                        RSVP Accepted
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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