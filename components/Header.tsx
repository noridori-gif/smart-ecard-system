"use client";

type HeaderProps = {
  onMenuClick: () => void;
};

export default function Header({
  onMenuClick,
}: HeaderProps) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl text-blue-800 hover:bg-blue-100 lg:hidden"
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">
              Dashboard
            </h2>

            <p className="mt-1 hidden text-sm text-slate-500 sm:block">
              Welcome back to Smart Event Pass
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-xl hover:bg-amber-100"
            aria-label="Notifications"
          >
            🔔
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 font-bold text-white">
              N
            </div>

            <div className="hidden sm:block">
              <p className="font-semibold text-slate-900">
                Noriega
              </p>

              <p className="text-xs text-slate-500">
                Administrator
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}