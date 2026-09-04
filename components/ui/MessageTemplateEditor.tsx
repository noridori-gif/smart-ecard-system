"use client";

import { useRef } from "react";

import { analyzeSms } from "@/services/smsAnalysis";

export default function MessageTemplateEditor({
  label,
  value,
  onChange,
  placeholders,
  renderPreview,
  buildDefault,
  prominentSegmentWarning = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholders: readonly string[];
  renderPreview: (template: string) => string;
  buildDefault: () => string;
  prominentSegmentWarning?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertPlaceholder(token: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}{${token}}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length + 2, start + token.length + 2);
    });
  }

  const previewText = value.trim() ? renderPreview(value) : buildDefault();
  const analysis = analyzeSms(previewText);
  const overLimit = analysis.segments > 1;

  return (
    <div className="rounded-xl border border-[#e7e1d7] bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="sep-label">{label}</p>
        {value.trim() && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs font-bold text-emerald-700 underline underline-offset-2"
          >
            Reset to default
          </button>
        )}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Leave blank to use the default message"
        rows={5}
        className="sep-control mt-2 py-2 font-normal"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {placeholders.map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => insertPlaceholder(token)}
            className="rounded-full border border-[#e7e1d7] bg-stone-50 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            {`{${token}}`}
          </button>
        ))}
      </div>
      <p
        className={`mt-2 text-xs font-semibold ${overLimit ? "text-amber-700" : "text-slate-500"}`}
      >
        {analysis.units}/{analysis.singleLimit} characters · {analysis.segments} SMS segment
        {analysis.segments === 1 ? "" : "s"} ({analysis.encoding})
      </p>
      {prominentSegmentWarning && overLimit && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs font-bold text-amber-900"
        >
          This will send as {analysis.segments} separate SMS segments — the guest is billed per
          segment and carriers can deliver them out of order. The invite link alone takes up a
          large share of the first {analysis.singleLimit}-character segment, so keep your own
          wording short.
        </p>
      )}
      <div className="mt-3 rounded-lg border border-[#e7e1d7] bg-stone-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Preview{!value.trim() && " (default)"}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{previewText}</p>
      </div>
    </div>
  );
}
