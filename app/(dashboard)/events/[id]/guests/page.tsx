"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import {
  createGuest,
  getGuestsByEvent,
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
  const [formData, setFormData] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadGuests() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const data = await getGuestsByEvent(eventId);
      setGuests(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Wageni hawakuweza kupatikana.";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isNaN(eventId)) {
      loadGuests();
    }
  }, [eventId]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const newGuest: NewGuest = {
      event_id: eventId,
      full_name: formData.full_name,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      category: formData.category,
      allowed_guests: Number(formData.allowed_guests),
    };

    try {
      await createGuest(newGuest);

      setFormData(initialForm);
      setSuccessMessage("Mgeni ameongezwa vizuri.");

      await loadGuests();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Mgeni hakuweza kuhifadhiwa.";

      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section>
      <div>
        <h1 className="text-4xl font-bold text-blue-700">
          Guests
        </h1>

        <p className="mt-2 text-gray-600">
          Add and manage guests for Event #{eventId}.
        </p>
      </div>

      <div className="mt-8 rounded-xl bg-white p-8 shadow-md">
        <h2 className="text-2xl font-bold text-gray-800">
          Add New Guest
        </h2>

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

          <div className="flex items-end">
            <Button
              text={isSaving ? "Saving..." : "Add Guest"}
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
                      <Link
                        href={`/events/${eventId}/guests/${guest.id}/qr`}
                        className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        View QR
                      </Link>
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