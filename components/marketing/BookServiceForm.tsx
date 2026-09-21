"use client";

import { useState, type FormEvent } from "react";

const EVENT_TYPES = [
  { id: "wedding", en: "Wedding", sw: "Harusi" },
  { id: "sendoff", en: "Send-off", sw: "Kupeleka Bibi" },
  { id: "birthday", en: "Birthday", sw: "Siku ya Kuzaliwa" },
  { id: "kitchen_party", en: "Kitchen Party", sw: "Kitchen Party" },
  { id: "corporate", en: "Corporate", sw: "Kampuni" },
];

export default function BookServiceForm() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [eventType, setEventType] = useState(EVENT_TYPES[0].id);
  const [eventDate, setEventDate] = useState("");
  const [website, setWebsite] = useState("");
  const [loadedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/public/service-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          eventType,
          eventDate: eventDate || null,
          website,
          durationMs: Date.now() - loadedAt,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setFullName("");
      setPhone("");
      setEventDate("");
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-white/20 bg-white/10 p-8 text-center backdrop-blur">
        <p className="text-lg font-bold text-white">Asante! We&apos;ll be in touch shortly.</p>
        <p className="mt-2 text-sm text-emerald-100">
          Tumepokea taarifa zako — timu yetu itawasiliana nawe hivi karibuni.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-8 grid max-w-2xl gap-4 text-left sm:grid-cols-2">
      <input
        type="text"
        name="website"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div>
        <label htmlFor="book-name" className="mb-1.5 block text-sm font-semibold text-emerald-100">
          Jina / Name
        </label>
        <input
          id="book-name"
          required
          maxLength={200}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-emerald-200/60 outline-none focus:border-white/50"
          placeholder="Jina lako kamili"
        />
      </div>

      <div>
        <label htmlFor="book-phone" className="mb-1.5 block text-sm font-semibold text-emerald-100">
          Namba ya WhatsApp / Phone
        </label>
        <input
          id="book-phone"
          required
          maxLength={20}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-emerald-200/60 outline-none focus:border-white/50"
          placeholder="07xx xxx xxx"
        />
      </div>

      <div>
        <label htmlFor="book-event-type" className="mb-1.5 block text-sm font-semibold text-emerald-100">
          Aina ya Tukio / Event Type
        </label>
        <select
          id="book-event-type"
          value={eventType}
          onChange={(event) => setEventType(event.target.value)}
          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/50"
        >
          {EVENT_TYPES.map((type) => (
            <option key={type.id} value={type.id} className="text-slate-900">
              {type.en} / {type.sw}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="book-event-date" className="mb-1.5 block text-sm font-semibold text-emerald-100">
          Tarehe ya Tukio / Event Date (hiari)
        </label>
        <input
          id="book-event-date"
          type="date"
          value={eventDate}
          onChange={(event) => setEventDate(event.target.value)}
          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/50 [color-scheme:dark]"
        />
      </div>

      {status === "error" && (
        <p className="text-sm font-semibold text-amber-200 sm:col-span-2">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-2 inline-flex items-center justify-center rounded-xl bg-white px-7 py-4 font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 sm:col-span-2"
      >
        {status === "submitting" ? "Inatuma..." : "Book Our Services / Tuma Ombi"}
      </button>
    </form>
  );
}
