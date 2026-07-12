"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import {
  getEventById,
  updateEvent,
  uploadEventCover,
  type Event,
  type EventLanguage,
} from "@/services/eventService";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type EditEventForm = {
  title: string;
  event_type: string;
  bride_name: string;
  groom_name: string;

  language: EventLanguage;

  ceremony_title: string;
  ceremony_date: string;
  ceremony_time: string;
  ceremony_venue: string;
  ceremony_map_url: string;

  event_date: string;
  event_time: string;
  venue: string;
  reception_map_url: string;

  dress_code: string;
};

const initialForm: EditEventForm = {
  title: "",
  event_type: "",
  bride_name: "",
  groom_name: "",

  language: "sw",

  ceremony_title: "Ibada ya Ndoa",
  ceremony_date: "",
  ceremony_time: "",
  ceremony_venue: "",
  ceremony_map_url: "",

  event_date: "",
  event_time: "",
  venue: "",
  reception_map_url: "",

  dress_code: "",
};

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = Number(params.id);

  const [formData, setFormData] =
    useState<EditEventForm>(initialForm);

  const [currentEvent, setCurrentEvent] =
    useState<Event | null>(null);

  const [newCoverImage, setNewCoverImage] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [removeCurrentCover, setRemoveCurrentCover] =
    useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadEvent() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        if (Number.isNaN(eventId)) {
          throw new Error("Invalid event ID.");
        }

        const event = await getEventById(eventId);

        if (!event) {
          throw new Error("Event haikupatikana.");
        }

        setCurrentEvent(event);

        setFormData({
          title: event.title,
          event_type: event.event_type,
          bride_name: event.bride_name ?? "",
          groom_name: event.groom_name ?? "",

          language: event.language ?? "sw",

          ceremony_title:
            event.ceremony_title ??
            (event.language === "en"
              ? "Wedding Ceremony"
              : "Ibada ya Ndoa"),

          ceremony_date: event.ceremony_date ?? "",

          ceremony_time: event.ceremony_time
            ? event.ceremony_time.slice(0, 5)
            : "",

          ceremony_venue:
            event.ceremony_venue ?? "",

          ceremony_map_url:
            event.ceremony_map_url ?? "",

          event_date: event.event_date,

          event_time: event.event_time
            ? event.event_time.slice(0, 5)
            : "",

          venue: event.venue,

          reception_map_url:
            event.reception_map_url ?? "",

          dress_code: event.dress_code ?? "",
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Event haikuweza kupatikana."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadEvent();
  }, [eventId]);

  function handleChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleLanguageChange(
    event: ChangeEvent<HTMLSelectElement>
  ) {
    const language =
      event.target.value as EventLanguage;

    setFormData((currentData) => ({
      ...currentData,
      language,
      ceremony_title:
        currentData.ceremony_title ===
          "Ibada ya Ndoa" ||
        currentData.ceremony_title ===
          "Wedding Ceremony"
          ? language === "sw"
            ? "Ibada ya Ndoa"
            : "Wedding Ceremony"
          : currentData.ceremony_title,
    }));
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setErrorMessage("");
    setSuccessMessage("");

    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
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

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl =
      URL.createObjectURL(selectedFile);

    setNewCoverImage(selectedFile);
    setImagePreview(previewUrl);
    setRemoveCurrentCover(false);
  }

  function removeNewImage() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setNewCoverImage(null);
    setImagePreview("");
  }

  function handleRemoveCurrentCover() {
    setRemoveCurrentCover(true);
    setNewCoverImage(null);

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview("");
  }

  function restoreCurrentCover() {
    setRemoveCurrentCover(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!currentEvent) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      let coverImageUrl =
        currentEvent.cover_image_url ?? null;

      if (removeCurrentCover) {
        coverImageUrl = null;
      }

      if (newCoverImage) {
        coverImageUrl =
          await uploadEventCover(newCoverImage);
      }

      const updatedEvent = await updateEvent(
        eventId,
        {
          title: formData.title,
          event_type: formData.event_type,

          bride_name:
            formData.bride_name || undefined,

          groom_name:
            formData.groom_name || undefined,

          language: formData.language,

          ceremony_title:
            formData.ceremony_title || undefined,

          ceremony_date:
            formData.ceremony_date || undefined,

          ceremony_time:
            formData.ceremony_time || undefined,

          ceremony_venue:
            formData.ceremony_venue || undefined,

          ceremony_map_url:
            formData.ceremony_map_url || undefined,

          event_date: formData.event_date,
          event_time: formData.event_time,
          venue: formData.venue,

          reception_map_url:
            formData.reception_map_url || undefined,

          dress_code:
            formData.dress_code || undefined,

          cover_image_url: coverImageUrl,
        }
      );

      setCurrentEvent(updatedEvent);

      setSuccessMessage(
        "Event imebadilishwa vizuri."
      );

      setNewCoverImage(null);
      setRemoveCurrentCover(false);

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setImagePreview("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Event haikuweza kubadilishwa."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section>
        <div className="rounded-xl bg-white p-8 shadow-md">
          <p className="text-gray-500">
            Loading event...
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
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="rounded-xl bg-white p-5 shadow-md sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Edit Event
            </h1>

            <p className="mt-2 text-gray-500">
              Badilisha taarifa za event bila kuathiri QR,
              guests au invitation links.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/events")}
            className="w-fit rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            Back to Events
          </button>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-emerald-700">
            {successMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-10"
        >
          <section>
            <div className="border-b border-gray-200 pb-3">
              <h2 className="text-xl font-bold text-gray-800">
                General Information
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Taarifa za msingi za event.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
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
                value={formData.bride_name}
                placeholder="Bride or celebrant name"
                onChange={handleChange}
              />

              <Input
                label="Groom Name"
                name="groom_name"
                value={formData.groom_name}
                placeholder="Groom name"
                onChange={handleChange}
              />

              <div>
                <label
                  htmlFor="language"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Invitation Language
                </label>

                <select
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={handleLanguageChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="sw">
                    Kiswahili
                  </option>

                  <option value="en">
                    English
                  </option>
                </select>
              </div>

              <Input
                label="Dress Code"
                name="dress_code"
                value={formData.dress_code}
                placeholder="Royal Blue and Gold"
                onChange={handleChange}
              />
            </div>
          </section>

          <section>
            <div className="border-b border-gray-200 pb-3">
              <h2 className="text-xl font-bold text-gray-800">
                Wedding Ceremony / Ibada
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Acha sehemu hizi wazi kama event haina ibada.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                label="Ceremony Title"
                name="ceremony_title"
                value={formData.ceremony_title}
                placeholder="Ibada ya Ndoa"
                onChange={handleChange}
              />

              <Input
                label="Ceremony Venue"
                name="ceremony_venue"
                value={formData.ceremony_venue}
                placeholder="Kanisa la KKKT Kibangu"
                onChange={handleChange}
              />

              <Input
                label="Ceremony Date"
                name="ceremony_date"
                type="date"
                value={formData.ceremony_date}
                onChange={handleChange}
              />

              <Input
                label="Ceremony Time"
                name="ceremony_time"
                type="time"
                value={formData.ceremony_time}
                onChange={handleChange}
              />

              <div className="md:col-span-2">
                <Input
                  label="Ceremony Google Maps Link"
                  name="ceremony_map_url"
                  type="url"
                  value={formData.ceremony_map_url}
                  placeholder="https://maps.google.com/..."
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>

          <section>
            <div className="border-b border-gray-200 pb-3">
              <h2 className="text-xl font-bold text-gray-800">
                Reception / Sherehe
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Taarifa za sehemu kuu ya sherehe au mapokezi.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                label="Reception Date"
                name="event_date"
                type="date"
                value={formData.event_date}
                required
                onChange={handleChange}
              />

              <Input
                label="Reception Time"
                name="event_time"
                type="time"
                value={formData.event_time}
                required
                onChange={handleChange}
              />

              <div className="md:col-span-2">
                <Input
                  label="Reception Venue"
                  name="venue"
                  value={formData.venue}
                  placeholder="Mlimani City Hall"
                  required
                  onChange={handleChange}
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Reception Google Maps Link"
                  name="reception_map_url"
                  type="url"
                  value={formData.reception_map_url}
                  placeholder="https://maps.google.com/..."
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>

          <section>
            <div className="border-b border-gray-200 pb-3">
              <h2 className="text-xl font-bold text-gray-800">
                Event Cover Photo
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Badilisha, ondoa au acha picha iliyopo.
              </p>
            </div>

            <div className="mt-6">
              <label
                htmlFor="coverImage"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Change Cover Photo
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
              </p>
            </div>

            {imagePreview && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="New event cover preview"
                    className="h-64 w-full rounded-xl object-cover"
                  />

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={removeNewImage}
                    className="absolute right-3 top-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700"
                  >
                    Remove New Photo
                  </button>
                </div>
              </div>
            )}

            {!imagePreview &&
              currentEvent.cover_image_url &&
              !removeCurrentCover && (
                <div className="mt-6">
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Current Cover Photo
                  </p>

                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <div className="relative">
                      <img
                        src={currentEvent.cover_image_url}
                        alt={currentEvent.title}
                        className="h-64 w-full rounded-xl object-cover"
                      />

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={handleRemoveCurrentCover}
                        className="absolute right-3 top-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700"
                      >
                        Remove Current Photo
                      </button>
                    </div>
                  </div>
                </div>
              )}

            {removeCurrentCover && !imagePreview && (
              <div className="mt-6 rounded-lg bg-amber-50 p-4 text-amber-800">
                <p>
                  Cover photo itaondolewa ukibonyeza{" "}
                  <strong>Update Event</strong>.
                </p>

                <button
                  type="button"
                  onClick={restoreCurrentCover}
                  className="mt-3 rounded-lg bg-amber-200 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-300"
                >
                  Restore Current Photo
                </button>
              </div>
            )}
          </section>

          <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row">
            <Button
              text={
                isSaving
                  ? newCoverImage
                    ? "Uploading and Updating..."
                    : "Updating..."
                  : "Update Event"
              }
              type="submit"
              disabled={isSaving}
            />

            <button
              type="button"
              disabled={isSaving}
              onClick={() => router.push("/events")}
              className="rounded-lg bg-gray-200 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}