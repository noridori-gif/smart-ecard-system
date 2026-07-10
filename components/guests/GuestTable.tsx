import Link from "next/link";
import type { Guest } from "@/services/guestService";

type GuestTableProps = {
  guests: Guest[];
  eventId: number;
  isLoading: boolean;
  deletingGuestId: number | null;
  onDelete: (guest: Guest) => void;
};

export default function GuestTable({
  guests,
  eventId,
  isLoading,
  deletingGuestId,
  onDelete,
}: GuestTableProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-md">
      <div className="border-b border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Guest List
        </h2>
      </div>

      {isLoading && (
        <p className="p-8 text-gray-500">
          Loading guests...
        </p>
      )}

      {!isLoading && guests.length === 0 && (
        <p className="p-8 text-gray-500">
          No guests have been added yet.
        </p>
      )}

      {!isLoading && guests.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-sm uppercase text-gray-600">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Allowed</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {guests.map((guest) => (
                <tr key={guest.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-800">
                    {guest.full_name}
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    {guest.phone || "-"}
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    {guest.category || "Normal"}
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    {guest.allowed_guests}
                  </td>

                  <td className="px-6 py-4">
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-800">
                      {guest.status}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/events/${eventId}/guests/${guest.id}/qr`}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        View QR
                      </Link>

                      <button
                        type="button"
                        onClick={() => onDelete(guest)}
                        disabled={deletingGuestId === guest.id}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                      >
                        {deletingGuestId === guest.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}