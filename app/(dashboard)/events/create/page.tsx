"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import {
  createEvent,
  type NewEvent,
} from "@/services/eventService";

const initialForm: NewEvent = {
  title: "",
  event_type: "",
  bride_name: "",
  groom_name: "",
  event_date: "",
  event_time: "",
  venue: "",
};

export default function CreateEventPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<NewEvent>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    try {
      await createEvent(formData);

      setFormData(initialForm);

      router.push("/events");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Event haikuweza kuhifadhiwa.";

      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section>
      <div className="rounded-xl bg-white p-8 shadow-md">
        <h1 className="text-3xl font-bold text-gray-800">
          Create New Event
        </h1>

        <p className="mt-2 text-gray-500">
          Fill in the event details below.
        </p>

        {errorMessage && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          <Input
            label="Event Title"
            name="title"
            value={formData.title}
            placeholder="John & Mary Wedding"
            required
            onChange={handleChange}
          />

          <Input
            label="Event Type"
            name="event_type"
            value={formData.event_type}
            placeholder="Wedding, Conference, Graduation"
            required
            onChange={handleChange}
          />

          <Input
            label="Bride Name"
            name="bride_name"
            value={formData.bride_name ?? ""}
            placeholder="Bride name"
            onChange={handleChange}
          />

          <Input
            label="Groom Name"
            name="groom_name"
            value={formData.groom_name ?? ""}
            placeholder="Groom name"
            onChange={handleChange}
          />

          <Input
            label="Event Date"
            name="event_date"
            type="date"
            value={formData.event_date}
            required
            onChange={handleChange}
          />

          <Input
            label="Event Time"
            name="event_time"
            type="time"
            value={formData.event_time}
            required
            onChange={handleChange}
          />

          <Input
            label="Venue"
            name="venue"
            value={formData.venue}
            placeholder="Mlimani City Hall"
            required
            onChange={handleChange}
          />

          <div className="md:col-span-2">
            <Button
              text={isSaving ? "Saving..." : "Save Event"}
              type="submit"
              disabled={isSaving}
            />
          </div>
        </form>
      </div>
    </section>
  );
}