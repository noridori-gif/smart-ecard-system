"use client";

import { useEffect, useState } from "react";
import {
  getImportHistory,
  type ImportHistory,
} from "@/services/importHistoryService";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function ImportHistoryPage() {
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const data = await getImportHistory();
      setHistory(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Guest Import History
        </h1>

        <p className="mt-2 text-slate-600">
          Kumbukumbu za imports zote zilizofanyika.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-8 shadow">
          Loading...
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-xl bg-white p-8 shadow text-center">
          Hakuna import history bado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow">

          <table className="w-full">

            <thead className="bg-slate-100">

              <tr>

                <th className="px-4 py-3 text-left">
                  Date
                </th>

                <th className="px-4 py-3 text-left">
                  Event
                </th>

                <th className="px-4 py-3 text-left">
                  File
                </th>

                <th className="px-4 py-3 text-center">
                  Total
                </th>

                <th className="px-4 py-3 text-center">
                  Imported
                </th>

                <th className="px-4 py-3 text-center">
                  Failed
                </th>

                <th className="px-4 py-3 text-center">
                  By
                </th>

              </tr>

            </thead>

            <tbody>

              {history.map((item) => (

                <tr
                  key={item.id}
                  className="border-t"
                >

                  <td className="px-4 py-3">
                    {formatDate(item.imported_at)}
                  </td>

                  <td className="px-4 py-3">
                    {item.events?.title}
                  </td>

                  <td className="px-4 py-3">
                    {item.file_name}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {item.total_rows}
                  </td>

                  <td className="px-4 py-3 text-center text-green-700 font-bold">
                    {item.imported_rows}
                  </td>

                  <td className="px-4 py-3 text-center text-red-600 font-bold">
                    {item.failed_rows}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {item.imported_by ?? "-"}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      )}

    </section>
  );
}