"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  createEvent,
  uploadEventCover,
  type EventLanguage,
  type InvitationTemplate,
} from "@/services/eventService";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const invitationTemplates: Array<{
  value: InvitationTemplate;
  name: string;
  description: string;
  icon: string;
}> = [
  {
    value: "classic_photo",
    name: "Classic Photo",
    description:
      "Picha kubwa, taarifa za event, countdown, RSVP na Event Pass.",
    icon: "📷",
  },
  {
    value: "elegant_gold",
    name: "Elegant Gold",
    description:
      "Muonekano wa kadi ndefu wenye rangi za dhahabu na maandishi rasmi.",
    icon: "✨",
  },
  {
    value: "luxury_envelope",
    name: "Luxury Envelope",
    description:
      "Bahasha inayofunguka, invitation experience na taarifa zote za event.",
    icon: "💌",
  },
  {
    value: "modern_floral",
    name: "Modern Floral",
    description:
      "Design nyepesi ya kisasa yenye mapambo ya maua na rangi laini.",
    icon: "🌿",
  },
];

type CreateEventForm = {
  title: string;
  event_type: string;
  bride_name: string;
  groom_name: string;
  language: EventLanguage;
  invitation_template: InvitationTemplate;

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

const initialForm: CreateEventForm = {
  title: "",
  event_type: "",
  bride_name: "",
  groom_name: "",
  language: "sw",
  invitation_template: "classic_photo",

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

export default function CreateEventPage() {
  const router = useRouter();

  const [formData, setFormData] =
    useState<CreateEventForm>(initialForm);

  const [coverImage, setCoverImage] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  function handleChange(
    event:
      | ChangeEvent<HTMLInputElement>
      | ChangeEvent<HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setErrorMessage("");
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
        language === "en"
          ? "Wedding Ceremony"
          : "Ibada ya Ndoa",
    }));

    setErrorMessage("");
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setErrorMessage("");

    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      !selectedFile.type.startsWith("image/")
    ) {
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

    setCoverImage(selectedFile);
    setImagePreview(previewUrl);
  }

  function removeImage() {
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
        title: formData.title,
        event_type: formData.event_type,

        bride_name:
          formData.bride_name || undefined,

        groom_name:
          formData.groom_name || undefined,

        language: formData.language,

        invitation_template:
          formData.invitation_template,

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
      });

      router.push("/events");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Event haikuweza kutengenezwa."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section>
      <div className="rounded-xl bg-white p-5 shadow-md sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Create Event
            </h1>

            <p className="mt-2 text-gray-500">
              Weka taarifa za event mpya.
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
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-10"
        >
          <FormSection
            title="General Information"
            description="Taarifa za msingi za event."
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field
                label="Event Title"
                name="title"
                value={formData.title}
                placeholder="John & Mary Wedding"
                required
                onChange={handleChange}
              />

              <Field
                label="Event Type"
                name="event_type"
                value={formData.event_type}
                placeholder="Wedding, Send-off, Birthday"
                required
                onChange={handleChange}
              />

              <Field
                label="Bride / Celebrant Name"
                name="bride_name"
                value={formData.bride_name}
                placeholder="Bride or celebrant name"
                onChange={handleChange}
              />

              <Field
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
                  disabled={isSaving}
                  onChange={handleLanguageChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="sw">
                    Kiswahili
                  </option>

                  <option value="en">
                    English
                  </option>
                </select>
              </div>

              <Field
                label="Dress Code"
                name="dress_code"
                value={formData.dress_code}
                placeholder="Royal Blue and Gold"
                onChange={handleChange}
              />
            </div>
          </FormSection>

          <FormSection
            title="Choose Invitation Design"
            description="Chagua muonekano ambao wageni wataona wanapofungua link ya mwaliko."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {invitationTemplates.map((template) => {
                const isSelected =
                  formData.invitation_template ===
                  template.value;

                return (
                  <label
                    key={template.value}
                    className={`relative cursor-pointer rounded-2xl border-2 p-5 transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 shadow-md"
                        : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="invitation_template"
                      value={template.value}
                      checked={isSelected}
                      disabled={isSaving}
                      onChange={handleChange}
                      className="sr-only"
                    />

                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                        {template.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-bold text-gray-900">
                            {template.name}
                          </h3>

                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              isSelected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {isSelected ? "✓" : ""}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </FormSection>

          <FormSection
            title="Wedding Ceremony"
            description="Taarifa za ibada au ceremony. Unaweza kuziacha wazi kama hazihitajiki."
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field
                label="Ceremony Title"
                name="ceremony_title"
                value={formData.ceremony_title}
                placeholder="Ibada ya Ndoa"
                onChange={handleChange}
              />

              <Field
                label="Ceremony Date"
                name="ceremony_date"
                type="date"
                value={formData.ceremony_date}
                onChange={handleChange}
              />

              <Field
                label="Ceremony Time"
                name="ceremony_time"
                type="time"
                value={formData.ceremony_time}
                onChange={handleChange}
              />

              <Field
                label="Ceremony Venue"
                name="ceremony_venue"
                value={formData.ceremony_venue}
                placeholder="Church or ceremony venue"
                onChange={handleChange}
              />

              <div className="md:col-span-2">
                <Field
                  label="Ceremony Google Maps Link"
                  name="ceremony_map_url"
                  type="url"
                  value={formData.ceremony_map_url}
                  placeholder="https://maps.google.com/..."
                  onChange={handleChange}
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Main Event / Reception"
            description="Taarifa za event kuu au reception."
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field
                label="Event Date"
                name="event_date"
                type="date"
                value={formData.event_date}
                required
                onChange={handleChange}
              />

              <Field
                label="Event Time"
                name="event_time"
                type="time"
                value={formData.event_time}
                required
                onChange={handleChange}
              />

              <Field
                label="Venue"
                name="venue"
                value={formData.venue}
                placeholder="Dar es Salaam"
                required
                onChange={handleChange}
              />

              <Field
                label="Reception Google Maps Link"
                name="reception_map_url"
                type="url"
                value={formData.reception_map_url}
                placeholder="https://maps.google.com/..."
                onChange={handleChange}
              />
            </div>
          </FormSection>

          <FormSection
            title="Cover Image"
            description="Pakia picha ya event. Picha isizidi 5 MB."
          >
            <input
              type="file"
              accept="image/*"
              disabled={isSaving}
              onChange={handleImageChange}
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700"
            />

            {imagePreview && (
              <div className="mt-5">
                <img
                  src={imagePreview}
                  alt="Event cover preview"
                  className="max-h-72 w-full rounded-xl object-cover md:max-w-xl"
                />

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={removeImage}
                  className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Remove Image
                </button>
              </div>
            )}
          </FormSection>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => router.push("/events")}
              className="rounded-lg bg-gray-100 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Creating Event..."
                : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

type FieldProps = {
  label: string;
  name: string;
  value: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
};

function Field({
  label,
  name,
  value,
  type = "text",
  placeholder,
  required = false,
  onChange,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={onChange}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

type FormSectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function FormSection({
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <section>
      <div className="border-b border-gray-200 pb-3">
        <h2 className="text-xl font-bold text-gray-800">
          {title}
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          {description}
        </p>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}