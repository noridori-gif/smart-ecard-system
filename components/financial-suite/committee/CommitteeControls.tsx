"use client";

import { committeeTheme } from "./theme";

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function CommitteeSearchBar({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
        <SearchIcon />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`sep-card min-h-12 w-full py-3 pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-400 ${committeeTheme.focus} focus-visible:ring-emerald-600`}
      />
    </label>
  );
}

export function CommitteeFilterChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div
        className="flex min-w-max gap-2"
        role="group"
        aria-label={label}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-full border px-4 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              value === option.value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-[#ddd7cd] bg-white text-slate-700 hover:border-slate-400"
            }`}
            aria-pressed={value === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CommitteeEmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="sep-card px-4 py-10 text-center">
      <p className="text-[15px] text-slate-500">{message}</p>
    </div>
  );
}
