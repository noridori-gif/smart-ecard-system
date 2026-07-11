"use client";

import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import {
  createEvent,
  uploadEventCover,
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
  cover_image_url: null,
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export default function CreateEventPage() {
  const router = useRouter();

  const [formData, setFormData] =
    useState<NewEvent>(initialForm);

  const [coverImage, setCoverImage] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState<string>("");

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setErrorMessage("");

    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setCoverImage(null);
      setImagePreview("");
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setErrorMessage(
        "Tafadhali chagua file la picha pekee."
      );

      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_IMAGE_SIZE) {
      setErrorMessage(
        "Picha ni kubwa sana. Chagua picha isiyozidi 5 MB."
      );

      event.target.value = "";
      return;
    }

    setCoverImage(selectedFile);

    const previewUrl =
      URL.createObjectURL(selectedFile);

    setImagePreview(previewUrl);
  }

  function removeSelectedImage() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setCoverImage(null);
    setImagePreview("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setIsSaving(true);

    try {
      let coverImageUrl: string | null = null;

      if (coverImage) {
        coverImageUrl =
          await uploadEventCover(coverImage);
      }

      await createEvent({
        ...formData,
        cover_image_url: coverImageUrl,
      });

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setFormData(initialForm);
      setCoverImage(null);
      setImagePreview("");

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
      <div className="rounded-xl bg-white p-5 shadow-md sm:p-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Create New Event
        </h1>

        <p className="mt-2 text-gray-500">
          Fill in the event details and add a cover
          photo.
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
            placeholder="Wedding, Send-off, Birthday"
            required
            onChange={handleChange}
          />

          <Input
            label="Bride / Celebrant Name"
            name="bride_name"
            value={formData.bride_name ?? ""}
            placeholder="Bride or celebrant name"
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
            <label
              htmlFor="coverImage"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Event Cover Photo
            </label>

            <input
              id="coverImage"
              name="coverImage"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={isSaving}
              onChange={handleImageChange}
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />

            <p className="mt-2 text-xs text-gray-500">
              JPG, PNG au WEBP. Maximum size ni 5 MB.
              Picha yenye landscape orientation ndiyo
              inapendekezwa.
            </p>
          </div>

          {imagePreview && (
            <div className="md:col-span-2">
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Event cover preview"
                    className="h-64 w-full rounded-xl object-cover"
                  />

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={removeSelectedImage}
                    className="absolute right-3 top-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <Button
              text={
                isSaving
                  ? coverImage
                    ? "Uploading and Saving..."
                    : "Saving..."
                  : "Save Event"
              }
              type="submit"
              disabled={isSaving}
            />
          </div>
        </form>
      </div>
    </section>
  );
}