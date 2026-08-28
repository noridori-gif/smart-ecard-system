export default function TopContactBar() {
  return (
    <div className="border-b border-emerald-900/40 bg-slate-950 px-4 py-1.5 text-xs text-emerald-100 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-1 sm:flex-row sm:justify-between sm:gap-4">
        <a
          href="tel:+255754380297"
          className="inline-flex items-center gap-1.5 transition hover:text-emerald-300"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
          </svg>
          +255 754 380 297
        </a>

        <a
          href="mailto:info@smarteventpass.co.tz"
          className="inline-flex items-center gap-1.5 transition hover:text-emerald-300"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
            <path d="m3.5 6 8.5 6 8.5-6" />
          </svg>
          info@smarteventpass.co.tz
        </a>
      </div>
    </div>
  );
}
