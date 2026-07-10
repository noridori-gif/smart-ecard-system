import Link from "next/link";
import type { Guest } from "@/services/guestService";

type GuestRowProps = {
  guest: Guest;
  eventId: number;
  deletingGuestId: number | null;
  onDelete: (guest: Guest) => void;
};

export default function GuestRow({
  guest,
  eventId,
  deletingGuestId,
  onDelete,
}: GuestRowProps) {
  return (
    <tr className="hover:bg-gray-50">
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
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
          >
            {deletingGuestId === guest.id
              ? "Deleting..."
              : "Delete"}
          </button>

        </div>
      </td>
    </tr>
  );
}