"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import {
  getEventById,
  type Event,
} from "@/services/eventService";
import {
  createGuest,
  deleteGuest,
  getGuestsByEvent,
  updateGuest,
  type Guest,
  type NewGuest,
} from "@/services/guestService";

const initialForm = {
  full_name: "",
  phone: "",
  email: "",
  category: "Normal",
  allowed_guests: "1",
};

export default function EventGuestsPage() {
  const params = useParams();
  const eventId = Number(params.id);

  const [guests, setGuests] = useState<Guest[]>([]);
  const [currentEvent, setCurrentEvent] =
    useState<Event | null>(null);
  const [formData, setFormData] = useState(initialForm);

  const [editingGuestId, setEditingGuestId] =
    useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [deletingGuestId, setDeletingGuestId] =
    useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadGuests = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      if (!Number.isInteger(eventId)) {
        throw new Error("Event ID si sahihi.");
      }

      const event = await getEventById(eventId);

      if (!event) {
        setCurrentEvent(null);
        setGuests([]);
        throw new Error("Event haikupatikana.");
      }

      setCurrentEvent(event);

      const data = await getGuestsByEvent(eventId);
      setGuests(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Wageni hawakuweza kupatikana."
      );
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    const timer = setTimeout(() => void loadGuests(), 0);
    return () => clearTimeout(timer);
  }, [loadGuests]);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function resetForm() {
    setFormData(initialForm);
    setEditingGuestId(null);
  }

  function handleEditGuest(guest: Guest) {
    setEditingGuestId(guest.id);

    setFormData({
      full_name: guest.full_name,
      phone: guest.phone ?? "",
      email: guest.email ?? "",
      category: guest.category ?? "Normal",
      allowed_guests: String(guest.allowed_guests),
    });

    setErrorMessage("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (editingGuestId !== null) {
        await updateGuest(editingGuestId, {
          full_name: formData.full_name,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          category: formData.category,
          allowed_guests: Number(
            formData.allowed_guests
          ),
        });

        setSuccessMessage(
          "Taarifa za mgeni zimebadilishwa vizuri."
        );
      } else {
        const newGuest: NewGuest = {
          event_id: eventId,
          full_name: formData.full_name,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          category: formData.category,
          allowed_guests: Number(
            formData.allowed_guests
          ),
        };

        await createGuest(newGuest);

        setSuccessMessage(
          "Mgeni ameongezwa vizuri."
        );
      }

      resetForm();
      await loadGuests();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : editingGuestId !== null
            ? "Taarifa za mgeni hazikuweza kubadilishwa."
            : "Mgeni hakuweza kuhifadhiwa."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(guest: Guest) {
    const confirmed = window.confirm(
      `Una uhakika unataka kumfuta ${guest.full_name}?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingGuestId(guest.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteGuest(guest.id);

      if (editingGuestId === guest.id) {
        resetForm();
      }

      setSuccessMessage(
        `${guest.full_name} amefutwa vizuri.`
      );

      await loadGuests();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Mgeni hakuweza kufutwa."
      );
    } finally {
      setDeletingGuestId(null);
    }
  }

  if (isLoading) {
    return (
      <section>
        <div className="sep-card p-8">
          <p className="text-slate-500">
            Loading event and guests...
          </p>
        </div>
      </section>
    );
  }

  if (!currentEvent) {
    return (
      <section>
        <div className="sep-card p-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errorMessage || "Event haikupatikana."}
          </div>

          <Link
            href="/events"
            className="mt-5 inline-block rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
          >
            Back to Events
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div>
        <h1 className="sep-page-title">
          Guests
        </h1>

        <p className="mt-2 text-slate-600">
          Add and manage guests for {currentEvent.title}.
        </p>
      </div>

      <div className="mt-8 sep-card p-5 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="sep-section-title">
            {editingGuestId !== null
              ? "Edit Guest"
              : "Add New Guest"}
          </h2>

          {editingGuestId !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="w-fit min-h-11 rounded-xl bg-stone-100 px-4 text-sm font-semibold text-slate-700 hover:bg-stone-200"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {editingGuestId !== null && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            Unahariri taarifa za mgeni. QR code na invitation
            link vitabaki vilevile.
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            {successMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          <div className="space-y-2">
            <label htmlFor="full_name" className="sep-label block">Full Name</label>
            <input id="full_name" name="full_name" value={formData.full_name} placeholder="Guest full name" required onChange={handleChange} className="sep-control" />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="sep-label block">Phone</label>
            <input id="phone" name="phone" value={formData.phone} placeholder="+255..." onChange={handleChange} className="sep-control" />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="sep-label block">Email</label>
            <input id="email" name="email" type="email" value={formData.email} placeholder="guest@example.com" onChange={handleChange} className="sep-control" />
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="sep-label block">Category</label>
            <input id="category" name="category" value={formData.category} placeholder="VIP, Family, Friend, Normal" required onChange={handleChange} className="sep-control" />
          </div>

          <div className="space-y-2">
            <label htmlFor="allowed_guests" className="sep-label block">Allowed Guests</label>
            <input id="allowed_guests" name="allowed_guests" type="number" value={formData.allowed_guests} required onChange={handleChange} className="sep-control" />
          </div>

          <div className="flex items-end gap-3">
            <Button type="submit" loading={isSaving}>
              {editingGuestId !== null
                ? isSaving ? "Updating..." : "Update Guest"
                : isSaving ? "Saving..." : "Add Guest"}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8 sep-table-shell">
        <div className="border-b border-stone-200 p-6">
          <h2 className="sep-section-title">
            Guest List
          </h2>
        </div>

        {guests.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            No guests have been added yet.
          </p>
        )}

        {guests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="bg-stone-100 text-sm uppercase text-slate-600">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Allowed</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-200">
                {guests.map((guest) => (
                  <tr
                    key={guest.id}
                    className={
                      editingGuestId === guest.id
                        ? "bg-emerald-50"
                        : "hover:bg-stone-50"
                    }
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {guest.full_name}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {guest.phone || "-"}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {guest.category || "Normal"}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {guest.allowed_guests}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm capitalize ${
                          guest.status === "checked_in"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {guest.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/events/${eventId}/guests/${guest.id}/qr`}
                          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                        >
                          View QR
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            handleEditGuest(guest)
                          }
                          disabled={
                            deletingGuestId === guest.id
                          }
                          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(guest)
                          }
                          disabled={
                            deletingGuestId === guest.id
                          }
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
    </section>
  );
}
