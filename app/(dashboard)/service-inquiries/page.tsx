"use client";

import { useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { getCurrentUserProfile } from "@/services/profileService";

import {
  getEventTypeLabel,
  listServiceInquiries,
  updateServiceInquiryStatus,
  type ServiceInquiry,
  type ServiceInquiryStatus,
} from "@/services/serviceInquiryService";

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatEventDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusBadgeClass(status: ServiceInquiryStatus) {
  if (status === "contacted") {
    return "bg-blue-100 text-blue-800";
  }

  if (status === "closed") {
    return "bg-slate-200 text-slate-600";
  }

  return "bg-amber-100 text-amber-700";
}

function statusLabel(status: ServiceInquiryStatus) {
  if (status === "contacted" || status === "closed") {
    return "Imeshughulikiwa";
  }

  return "Mpya";
}

export default function ServiceInquiriesPage() {
  const router = useRouter();

  const [inquiries, setInquiries] = useState<ServiceInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadInquiries = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const currentProfile = await getCurrentUserProfile();

      if (!currentProfile) {
        router.replace("/login");
        router.refresh();

        return;
      }

      if (!currentProfile.is_active || currentProfile.role !== "admin") {
        router.replace("/dashboard");
        router.refresh();

        return;
      }

      const data = await listServiceInquiries();

      setInquiries(data);
    } catch (error) {
      console.error("Service inquiries loading error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Inquiries hazikuweza kupatikana."
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadInquiries(), 0);
    return () => window.clearTimeout(timer);
  }, [loadInquiries]);

  async function handleToggleStatus(inquiry: ServiceInquiry) {
    if (updatingId !== null) {
      return;
    }

    const nextStatus: ServiceInquiryStatus =
      inquiry.status === "new" ? "contacted" : "new";

    try {
      setUpdatingId(inquiry.id);
      setErrorMessage("");

      await updateServiceInquiryStatus(inquiry.id, nextStatus);

      setInquiries((current) =>
        current.map((item) =>
          item.id === inquiry.id ? { ...item, status: nextStatus } : item
        )
      );
    } catch (error) {
      console.error("Service inquiry status update error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Status haikuweza kubadilishwa."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="sep-page-title">Service Inquiries</h1>

        <p className="mt-2 text-sm text-slate-600">
          Watu waliojaza fomu ya &quot;Book Our Services&quot; kwenye homepage
          — piga simu au WhatsApp kisha weka alama imeshughulikiwa.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-[#e7e1d7] bg-white shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-700" />

            <p className="mt-4 text-sm text-slate-600">
              Inapakua inquiries...
            </p>
          </div>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Hakuna inquiry bado
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Fomu ya &quot;Book Our Services&quot; kwenye homepage
            itakapotumwa, itaonekana hapa.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e7e1d7] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Jina
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Simu / WhatsApp
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Aina ya Tukio
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tarehe ya Tukio
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ilitumwa
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {inquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {inquiry.full_name}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-slate-700">
                          +{inquiry.phone}
                        </span>

                        <a
                          href={`tel:+${inquiry.phone}`}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
                          title="Piga simu"
                          aria-label={`Piga simu ${inquiry.full_name}`}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
                          </svg>
                        </a>

                        <a
                          href={`https://wa.me/${inquiry.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
                          title="Fungua WhatsApp"
                          aria-label={`Fungua WhatsApp kwa ${inquiry.full_name}`}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                            <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.5 1.34 5.02L2 22l5.13-1.35A9.96 9.96 0 0 0 12.04 22c5.52 0 10-4.48 10-10s-4.48-10-10-10Zm5.84 14.24c-.25.7-1.45 1.34-2 1.43-.51.08-1.15.11-1.86-.12-.43-.14-.98-.32-1.69-.63-2.98-1.29-4.92-4.3-5.07-4.5-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.47.27-.29.6-.37.8-.37h.57c.18 0 .43-.07.67.51.25.6.85 2.07.92 2.22.08.15.13.32.03.52-.11.2-.16.33-.32.5-.16.18-.34.4-.48.54-.16.16-.33.33-.14.65.19.32.85 1.4 1.83 2.27 1.26 1.12 2.32 1.47 2.65 1.63.33.16.52.14.71-.08.19-.22.82-.95 1.04-1.28.22-.33.44-.27.73-.16.29.11 1.86.88 2.18 1.04.32.16.53.24.61.37.08.14.08.78-.17 1.48Z" />
                          </svg>
                        </a>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {getEventTypeLabel(inquiry.event_type)}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {formatEventDate(inquiry.event_date)}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {formatDateTime(inquiry.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(
                          inquiry.status
                        )}`}
                      >
                        {statusLabel(inquiry.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(inquiry)}
                        disabled={updatingId === inquiry.id}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-emerald-600 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingId === inquiry.id
                          ? "..."
                          : inquiry.status === "new"
                          ? "Weka Imeshughulikiwa"
                          : "Rudisha Mpya"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
