export default function Footer() {
  return (
    <footer className="mt-auto border-t border-emerald-900/40 bg-slate-950 px-6 py-8 text-slate-300">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:text-left">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
            Smart Event Pass
          </p>
          <p className="sep-caption mt-2 text-slate-400">
            Makuburi, Makoka, Dar es Salaam, Tanzania
          </p>
        </div>

        <div className="flex flex-col items-center gap-1.5 sm:items-end">
          <a
            href="tel:+255754380297"
            className="text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
          >
            +255 754 380 297
          </a>
          <a
            href="mailto:info@smarteventpass.co.tz"
            className="text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
          >
            info@smarteventpass.co.tz
          </a>
          <p className="sep-caption mt-1 text-slate-500">TIN: 133-666-400</p>
        </div>
      </div>
    </footer>
  );
}
