"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
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
        <div className="rounded-xl bg-white p-8 shadow-md">
          <p className="text-gray-500">
            Loading event and guests...
          </p>
        </div>
      </section>
    );
  }

  if (!currentEvent) {
    return (
      <section>
        <div className="rounded-xl bg-white p-8 shadow-md">
          <div className="rounded-lg bg-red-50 p-4 text-red-700">
            {errorMessage || "Event haikupatikana."}
          </div>

          <Link
            href="/events"
            className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
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
        <h1 className="text-4xl font-bold text-blue-700">
          Guests
        </h1>

        <p className="mt-2 text-gray-600">
          Add and manage guests for {currentEvent.title}.
        </p>
      </div>

      <div className="mt-8 rounded-xl bg-white p-5 shadow-md sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {editingGuestId !== null
              ? "Edit Guest"
              : "Add New Guest"}
          </h2>

          {editingGuestId !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="w-fit rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {editingGuestId !== null && (
          <div className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
            Unahariri taarifa za mgeni. QR code na invitation
            link vitabaki vilevile.
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-5 rounded-lg bg-green-50 p-4 text-green-700">
            {successMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          <Input
            label="Full Name"
            name="full_name"
            value={formData.full_name}
            placeholder="Guest full name"
            required
            onChange={handleChange}
          />

          <Input
            label="Phone"
            name="phone"
            value={formData.phone}
            placeholder="+255..."
            onChange={handleChange}
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            placeholder="guest@example.com"
            onChange={handleChange}
          />

          <Input
            label="Category"
            name="category"
            value={formData.category}
            placeholder="VIP, Family, Friend, Normal"
            required
            onChange={handleChange}
          />

          <Input
            label="Allowed Guests"
            name="allowed_guests"
            type="number"
            value={formData.allowed_guests}
            required
            onChange={handleChange}
          />

          <div className="flex items-end gap-3">
            <Button
              text={
                isSaving
                  ? editingGuestId !== null
                    ? "Updating..."
                    : "Saving..."
                  : editingGuestId !== null
                    ? "Update Guest"
                    : "Add Guest"
              }
              type="submit"
              disabled={isSaving}
            />
          </div>
        </form>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-md">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Guest List
          </h2>
        </div>

        {guests.length === 0 && (
          <p className="p-8 text-gray-500">
            No guests have been added yet.
          </p>
        )}

        {guests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
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
                  <tr
                    key={guest.id}
                    className={
                      editingGuestId === guest.id
                        ? "bg-blue-50"
                        : "hover:bg-gray-50"
                    }
                  >
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
                      <span
                        className={`rounded-full px-3 py-1 text-sm capitalize ${
                          guest.status === "checked_in"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
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
