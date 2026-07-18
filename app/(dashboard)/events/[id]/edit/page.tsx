"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import Button from "@/components/Button";
import Input from "@/components/Input";
import ThemePalettePicker, {
  type EventThemePalette,
} from "@/components/events/ThemePalettePicker";

import {
  DEFAULT_EVENT_THEME,
  getEventById,
  updateEvent,
  uploadEventCover,
  type Event,
  type EventLanguage,
  type InvitationTemplate,
} from "@/services/eventService";

const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;

const MAX_INVITATION_MESSAGE_LENGTH =
  600;

const HEX_COLOR_PATTERN =
  /^#[0-9A-Fa-f]{6}$/;

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
      "Kadi ndefu yenye rangi za dhahabu na maandishi rasmi.",
    icon: "✨",
  },
  {
    value: "luxury_envelope",
    name: "Luxury Envelope",
    description:
      "Bahasha inayofunguka na invitation experience yenye taarifa zote.",
    icon: "💌",
  },
  {
    value: "modern_floral",
    name: "Modern Floral",
    description:
      "Design ya kisasa yenye mapambo ya maua na rangi laini.",
    icon: "🌿",
  },
  {
    value: "royal_dark",
    name: "Royal Dark",
    description:
      "Dark luxury design yenye metallic accents, split photo na muonekano wa kifalme.",
    icon: "♛",
  },
  {
    value: "minimal_ivory",
    name: "Minimal Ivory",
    description:
      "Editorial ivory stationery yenye portrait ndogo, itinerary na typography safi.",
    icon: "◯",
  },
  {
    value: "african_royal",
    name: "African Royal",
    description:
      "Premium African editorial yenye geometric patterns, asymmetrical photo na royal details.",
    icon: "◆",
  },
  {
    value: "midnight_luxe",
    name: "Midnight Luxe",
    description:
      "Cinematic evening-gala layout yenye layered hero, floating title panel na fine-line glow.",
    icon: "☾",
  },
];

type EditEventForm = {
  title: string;
  event_type: string;

  bride_name: string;
  groom_name: string;

  language: EventLanguage;
  invitation_template: InvitationTemplate;
  invitation_message: string;

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

  theme_primary_color: string;
  theme_secondary_color: string;
  theme_accent_color: string;
};

type ThemePreset = {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
};

const initialForm: EditEventForm = {
  title: "",
  event_type: "",

  bride_name: "",
  groom_name: "",

  language: "sw",
  invitation_template: "classic_photo",
  invitation_message: "",

  ceremony_title:
    "Ibada ya Ndoa",

  ceremony_date: "",
  ceremony_time: "",
  ceremony_venue: "",
  ceremony_map_url: "",

  event_date: "",
  event_time: "",
  venue: "",
  reception_map_url: "",

  dress_code: "",

  theme_primary_color:
    DEFAULT_EVENT_THEME.primaryColor,

  theme_secondary_color:
    DEFAULT_EVENT_THEME.secondaryColor,

  theme_accent_color:
    DEFAULT_EVENT_THEME.accentColor,
};

const themePresets: ThemePreset[] = [
  {
    name: "Rose & Gold",
    primary: "#BE123C",
    secondary: "#FFF1F2",
    accent: "#D4AF37",
  },
  {
    name: "Royal Blue & Gold",
    primary: "#1D4ED8",
    secondary: "#EFF6FF",
    accent: "#D4AF37",
  },
  {
    name: "Emerald & Gold",
    primary: "#047857",
    secondary: "#ECFDF5",
    accent: "#D4AF37",
  },
  {
    name: "Purple & Silver",
    primary: "#7E22CE",
    secondary: "#FAF5FF",
    accent: "#94A3B8",
  },
  {
    name: "Black & Gold",
    primary: "#111827",
    secondary: "#F8FAFC",
    accent: "#D4AF37",
  },
  {
    name: "Burgundy & Cream",
    primary: "#881337",
    secondary: "#FFF7ED",
    accent: "#C08A3E",
  },
];

function getDefaultInvitationMessage(
  language: EventLanguage
) {
  if (language === "en") {
    return (
      "Together with their families, " +
      "they are delighted to invite you " +
      "to join them in celebrating this special occasion."
    );
  }

  return (
    "Pamoja na familia zao, " +
    "wanayo furaha kukualika " +
    "kushiriki katika tukio hili maalumu."
  );
}

function getInvitationPlaceholder(
  language: EventLanguage
) {
  if (language === "en") {
    return (
      "Example: The family of Dr. Joanna " +
      "of Dar es Salaam is delighted to invite you..."
    );
  }

  return (
    "Mfano: Familia ya Dr. Joanna wa Dar es Salaam " +
    "inayo furaha kukualika kushiriki nasi..."
  );
}

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();

  const eventId =
    Number(params.id);

  const [
    formData,
    setFormData,
  ] = useState<EditEventForm>(
    initialForm
  );

  const [
    currentEvent,
    setCurrentEvent,
  ] = useState<Event | null>(
    null
  );

  const [
    newCoverImage,
    setNewCoverImage,
  ] = useState<File | null>(
    null
  );

  const [
    imagePreview,
    setImagePreview,
  ] = useState("");

  const [
    removeCurrentCover,
    setRemoveCurrentCover,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  useEffect(() => {
    async function loadEvent() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        if (
          !Number.isInteger(
            eventId
          )
        ) {
          throw new Error(
            "Invalid event ID."
          );
        }

        const event =
          await getEventById(
            eventId
          );

        if (!event) {
          throw new Error(
            "Event haikupatikana."
          );
        }

        setCurrentEvent(
          event
        );

        setFormData({
          title:
            event.title,

          event_type:
            event.event_type,

          bride_name:
            event.bride_name ??
            "",

          groom_name:
            event.groom_name ??
            "",

          language:
            event.language ??
            "sw",

          invitation_template:
            event.invitation_template ??
            "classic_photo",

          invitation_message:
            event
              .invitation_message ??
            "",

          ceremony_title:
            event
              .ceremony_title ??
            (
              event.language ===
              "en"
                ? "Wedding Ceremony"
                : "Ibada ya Ndoa"
            ),

          ceremony_date:
            event
              .ceremony_date ??
            "",

          ceremony_time:
            event.ceremony_time
              ? event
                  .ceremony_time
                  .slice(0, 5)
              : "",

          ceremony_venue:
            event
              .ceremony_venue ??
            "",

          ceremony_map_url:
            event
              .ceremony_map_url ??
            "",

          event_date:
            event.event_date,

          event_time:
            event.event_time
              ? event
                  .event_time
                  .slice(0, 5)
              : "",

          venue:
            event.venue,

          reception_map_url:
            event
              .reception_map_url ??
            "",

          dress_code:
            event.dress_code ??
            "",

          theme_primary_color:
            event
              .theme_primary_color ||
            DEFAULT_EVENT_THEME
              .primaryColor,

          theme_secondary_color:
            event
              .theme_secondary_color ||
            DEFAULT_EVENT_THEME
              .secondaryColor,

          theme_accent_color:
            event
              .theme_accent_color ||
            DEFAULT_EVENT_THEME
              .accentColor,
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

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(
          imagePreview
        );
      }
    };
  }, [imagePreview]);

  function handleChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (currentData) => ({
        ...currentData,
        [name]: value,
      })
    );

    setSuccessMessage("");
  }

  function handleMessageChange(
    event:
      ChangeEvent<HTMLTextAreaElement>
  ) {
    const value =
      event.target.value.slice(
        0,
        MAX_INVITATION_MESSAGE_LENGTH
      );

    setFormData(
      (currentData) => ({
        ...currentData,

        invitation_message:
          value,
      })
    );

    setSuccessMessage("");
  }

  function handleLanguageChange(
    event:
      ChangeEvent<HTMLSelectElement>
  ) {
    const language =
      event.target
        .value as EventLanguage;

    setFormData(
      (currentData) => ({
        ...currentData,

        language,

        ceremony_title:
          currentData
            .ceremony_title ===
            "Ibada ya Ndoa" ||
          currentData
            .ceremony_title ===
            "Wedding Ceremony"
            ? language === "sw"
              ? "Ibada ya Ndoa"
              : "Wedding Ceremony"
            : currentData
                .ceremony_title,
      })
    );

    setSuccessMessage("");
  }

  function applyDefaultMessage() {
    setFormData(
      (currentData) => ({
        ...currentData,

        invitation_message:
          getDefaultInvitationMessage(
            currentData.language
          ),
      })
    );

    setSuccessMessage("");
  }

  function clearInvitationMessage() {
    setFormData(
      (currentData) => ({
        ...currentData,

        invitation_message:
          "",
      })
    );

    setSuccessMessage("");
  }

  function applyThemePreset(
    preset: ThemePreset
  ) {
    setFormData(
      (currentData) => ({
        ...currentData,

        theme_primary_color:
          preset.primary,

        theme_secondary_color:
          preset.secondary,

        theme_accent_color:
          preset.accent,
      })
    );

    setSuccessMessage("");
  }

  function applyDressCodePalette(
    palette: EventThemePalette
  ) {
    setFormData(
      (currentData) => ({
        ...currentData,

        dress_code:
          palette.dressCode,

        theme_primary_color:
          palette.primaryColor,

        theme_secondary_color:
          palette.secondaryColor,

        theme_accent_color:
          palette.accentColor,
      })
    );

    setSuccessMessage("");
    setErrorMessage("");
  }

  function handleImageChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    setErrorMessage("");
    setSuccessMessage("");

    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      !selectedFile.type.startsWith(
        "image/"
      )
    ) {
      setErrorMessage(
        "Tafadhali chagua file la picha pekee."
      );

      event.target.value = "";

      return;
    }

    if (
      selectedFile.size >
      MAX_IMAGE_SIZE
    ) {
      setErrorMessage(
        "Picha ni kubwa sana. Chagua picha isiyozidi 5 MB."
      );

      event.target.value = "";

      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    const previewUrl =
      URL.createObjectURL(
        selectedFile
      );

    setNewCoverImage(
      selectedFile
    );

    setImagePreview(
      previewUrl
    );

    setRemoveCurrentCover(
      false
    );
  }

  function removeNewImage() {
    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    setNewCoverImage(null);
    setImagePreview("");
  }

  function handleRemoveCurrentCover() {
    setRemoveCurrentCover(
      true
    );

    setNewCoverImage(
      null
    );

    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    setImagePreview("");
  }

  function restoreCurrentCover() {
    setRemoveCurrentCover(
      false
    );
  }

  function validateThemeColors() {
    return [
      formData
        .theme_primary_color,

      formData
        .theme_secondary_color,

      formData
        .theme_accent_color,
    ].every(
      (color) =>
        HEX_COLOR_PATTERN.test(
          color
        )
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!currentEvent) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (!validateThemeColors()) {
      setErrorMessage(
        "Theme colors lazima ziwe hex colors sahihi, mfano #BE123C."
      );

      return;
    }

    if (
      formData
        .invitation_message
        .length >
      MAX_INVITATION_MESSAGE_LENGTH
    ) {
      setErrorMessage(
        `Ujumbe wa mwaliko usizidi characters ${MAX_INVITATION_MESSAGE_LENGTH}.`
      );

      return;
    }

    setIsSaving(true);

    try {
      let coverImageUrl =
        currentEvent
          .cover_image_url ??
        null;

      if (removeCurrentCover) {
        coverImageUrl =
          null;
      }

      if (newCoverImage) {
        coverImageUrl =
          await uploadEventCover(
            newCoverImage
          );
      }

      const updatedEvent =
        await updateEvent(
          eventId,
          {
            title:
              formData.title,

            event_type:
              formData
                .event_type,

            bride_name:
              formData
                .bride_name ||
              undefined,

            groom_name:
              formData
                .groom_name ||
              undefined,

            language:
              formData.language,

            invitation_template:
              formData.invitation_template,

            invitation_message:
              formData
                .invitation_message ||
              undefined,

            ceremony_title:
              formData
                .ceremony_title ||
              undefined,

            ceremony_date:
              formData
                .ceremony_date ||
              undefined,

            ceremony_time:
              formData
                .ceremony_time ||
              undefined,

            ceremony_venue:
              formData
                .ceremony_venue ||
              undefined,

            ceremony_map_url:
              formData
                .ceremony_map_url ||
              undefined,

            event_date:
              formData
                .event_date,

            event_time:
              formData
                .event_time,

            venue:
              formData.venue,

            reception_map_url:
              formData
                .reception_map_url ||
              undefined,

            dress_code:
              formData
                .dress_code ||
              undefined,

            cover_image_url:
              coverImageUrl,

            theme_primary_color:
              formData
                .theme_primary_color,

            theme_secondary_color:
              formData
                .theme_secondary_color,

            theme_accent_color:
              formData
                .theme_accent_color,
          }
        );

      setCurrentEvent(
        updatedEvent
      );

      setFormData(
        (currentData) => ({
          ...currentData,

          invitation_message:
            updatedEvent
              .invitation_message ??
            "",

          invitation_template:
            updatedEvent.invitation_template,

          theme_primary_color:
            updatedEvent
              .theme_primary_color,

          theme_secondary_color:
            updatedEvent
              .theme_secondary_color,

          theme_accent_color:
            updatedEvent
              .theme_accent_color,
        })
      );

      setSuccessMessage(
        "Event, ujumbe na invitation theme vimebadilishwa vizuri."
      );

      setNewCoverImage(
        null
      );

      setRemoveCurrentCover(
        false
      );

      if (imagePreview) {
        URL.revokeObjectURL(
          imagePreview
        );
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

  const displayedMessage =
    formData
      .invitation_message
      .trim() ||
    getDefaultInvitationMessage(
      formData.language
    );

  const remainingCharacters =
    MAX_INVITATION_MESSAGE_LENGTH -
    formData
      .invitation_message
      .length;

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
            {errorMessage ||
              "Event haikupatikana."}
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
              Badilisha taarifa,
              ujumbe na muonekano
              wa invitation.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/events"
              )
            }
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

        {successMessage && (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            {successMessage}
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-8 space-y-10"
        >
          <section>
            <SectionHeading
              title="General Information"
              description="Taarifa za msingi za event."
            />

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                label="Event Title"
                name="title"
                value={
                  formData.title
                }
                placeholder="John & Mary Wedding"
                required
                onChange={
                  handleChange
                }
              />

              <Input
                label="Event Type"
                name="event_type"
                value={
                  formData
                    .event_type
                }
                placeholder="Wedding, Send-off, Birthday"
                required
                onChange={
                  handleChange
                }
              />

              <Input
                label="Bride / Celebrant Name"
                name="bride_name"
                value={
                  formData
                    .bride_name
                }
                placeholder="Bride or celebrant name"
                onChange={
                  handleChange
                }
              />

              <Input
                label="Groom Name"
                name="groom_name"
                value={
                  formData
                    .groom_name
                }
                placeholder="Groom name"
                onChange={
                  handleChange
                }
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
                  value={
                    formData.language
                  }
                  disabled={
                    isSaving
                  }
                  onChange={
                    handleLanguageChange
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
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
                value={
                  formData
                    .dress_code
                }
                placeholder="Royal Blue and Gold"
                onChange={
                  handleChange
                }
              />
            </div>
          </section>

          <section>
            <SectionHeading
              title="Invitation Design"
              description="Chagua muonekano ambao wageni wataona wanapofungua link ya mwaliko."
            />

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
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
          </section>

          <section>
            <SectionHeading
              title="Invitation Message"
              description="Badilisha ujumbe maalumu unaoonekana juu ya jina la mgeni."
            />

            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label
                  htmlFor="invitation_message"
                  className="text-sm font-semibold text-slate-700"
                >
                  Ujumbe wa Mwaliko
                </label>

                <p
                  className={`text-xs font-semibold ${
                    remainingCharacters <
                    50
                      ? "text-amber-600"
                      : "text-slate-500"
                  }`}
                >
                  {
                    remainingCharacters
                  }{" "}
                  characters remaining
                </p>
              </div>

              <textarea
                id="invitation_message"
                name="invitation_message"
                value={
                  formData
                    .invitation_message
                }
                rows={6}
                maxLength={
                  MAX_INVITATION_MESSAGE_LENGTH
                }
                disabled={
                  isSaving
                }
                placeholder={getInvitationPlaceholder(
                  formData.language
                )}
                onChange={
                  handleMessageChange
                }
                className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-base leading-7 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              />

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={
                    isSaving
                  }
                  onClick={
                    applyDefaultMessage
                  }
                  className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                >
                  Use Example Message
                </button>

                {formData
                  .invitation_message && (
                  <button
                    type="button"
                    disabled={
                      isSaving
                    }
                    onClick={
                      clearInvitationMessage
                    }
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                  >
                    Clear Message
                  </button>
                )}
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Ukiacha sehemu hii
                wazi, mfumo utatumia
                ujumbe wa kawaida.
              </p>
            </div>

            <MessagePreview
              message={
                displayedMessage
              }
              primaryColor={
                formData
                  .theme_primary_color
              }
              secondaryColor={
                formData
                  .theme_secondary_color
              }
              accentColor={
                formData
                  .theme_accent_color
              }
            />
          </section>

          <section>
            <SectionHeading
              title="Invitation Theme"
              description="Badilisha rangi za invitation ili zifanane na dress code."
            />

            <div className="mt-6">
              <ThemePalettePicker
                primaryColor={
                  formData
                    .theme_primary_color
                }
                secondaryColor={
                  formData
                    .theme_secondary_color
                }
                accentColor={
                  formData
                    .theme_accent_color
                }
                disabled={isSaving}
                onSelect={
                  applyDressCodePalette
                }
              />
            </div>

            <p className="mt-6 text-sm font-semibold text-slate-700">
              Quick Theme Presets
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
              {themePresets.map(
                (preset) => (
                  <button
                    key={
                      preset.name
                    }
                    type="button"
                    disabled={
                      isSaving
                    }
                    onClick={() =>
                      applyThemePreset(
                        preset
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-400 hover:shadow-md disabled:opacity-60"
                  >
                    <div className="flex gap-2">
                      <ColorCircle
                        color={
                          preset.primary
                        }
                      />

                      <ColorCircle
                        color={
                          preset.secondary
                        }
                      />

                      <ColorCircle
                        color={
                          preset.accent
                        }
                      />
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {
                        preset.name
                      }
                    </p>
                  </button>
                )
              )}
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-3">
              <ColorPicker
                label="Primary Color"
                name="theme_primary_color"
                value={
                  formData
                    .theme_primary_color
                }
                disabled={
                  isSaving
                }
                onChange={
                  handleChange
                }
              />

              <ColorPicker
                label="Secondary Color"
                name="theme_secondary_color"
                value={
                  formData
                    .theme_secondary_color
                }
                disabled={
                  isSaving
                }
                onChange={
                  handleChange
                }
              />

              <ColorPicker
                label="Accent Color"
                name="theme_accent_color"
                value={
                  formData
                    .theme_accent_color
                }
                disabled={
                  isSaving
                }
                onChange={
                  handleChange
                }
              />
            </div>

            <ThemePreview
              template={formData.invitation_template}
              title={
                formData.title
              }
              dressCode={
                formData
                  .dress_code
              }
              primaryColor={
                formData
                  .theme_primary_color
              }
              secondaryColor={
                formData
                  .theme_secondary_color
              }
              accentColor={
                formData
                  .theme_accent_color
              }
            />
          </section>

          <section>
            <SectionHeading
              title="Wedding Ceremony / Ibada"
              description="Acha sehemu hizi wazi kama event haina ibada."
            />

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                label="Ceremony Title"
                name="ceremony_title"
                value={
                  formData
                    .ceremony_title
                }
                placeholder="Ibada ya Ndoa"
                onChange={
                  handleChange
                }
              />

              <Input
                label="Ceremony Venue"
                name="ceremony_venue"
                value={
                  formData
                    .ceremony_venue
                }
                placeholder="Kanisa la KKKT Kibangu"
                onChange={
                  handleChange
                }
              />

              <Input
                label="Ceremony Date"
                name="ceremony_date"
                type="date"
                value={
                  formData
                    .ceremony_date
                }
                onChange={
                  handleChange
                }
              />

              <Input
                label="Ceremony Time"
                name="ceremony_time"
                type="time"
                value={
                  formData
                    .ceremony_time
                }
                onChange={
                  handleChange
                }
              />

              <div className="md:col-span-2">
                <Input
                  label="Ceremony Google Maps Link"
                  name="ceremony_map_url"
                  type="url"
                  value={
                    formData
                      .ceremony_map_url
                  }
                  placeholder="https://maps.google.com/..."
                  onChange={
                    handleChange
                  }
                />
              </div>
            </div>
          </section>

          <section>
            <SectionHeading
              title="Reception / Sherehe"
              description="Taarifa za sehemu kuu ya sherehe."
            />

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                label="Reception Date"
                name="event_date"
                type="date"
                value={
                  formData
                    .event_date
                }
                required
                onChange={
                  handleChange
                }
              />

              <Input
                label="Reception Time"
                name="event_time"
                type="time"
                value={
                  formData
                    .event_time
                }
                required
                onChange={
                  handleChange
                }
              />

              <div className="md:col-span-2">
                <Input
                  label="Reception Venue"
                  name="venue"
                  value={
                    formData.venue
                  }
                  placeholder="Mlimani City Hall"
                  required
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Reception Google Maps Link"
                  name="reception_map_url"
                  type="url"
                  value={
                    formData
                      .reception_map_url
                  }
                  placeholder="https://maps.google.com/..."
                  onChange={
                    handleChange
                  }
                />
              </div>
            </div>
          </section>

          <section>
            <SectionHeading
              title="Event Cover Photo"
              description="Badilisha, ondoa au acha picha iliyopo."
            />

            <div className="mt-6">
              <label
                htmlFor="coverImage"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Change Cover Photo
              </label>

              <input
                id="coverImage"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={
                  isSaving
                }
                onChange={
                  handleImageChange
                }
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700 disabled:opacity-60"
              />
            </div>

            {imagePreview && (
              <CoverPreview
                imageUrl={
                  imagePreview
                }
                alt="New cover preview"
                buttonText="Remove New Photo"
                disabled={
                  isSaving
                }
                onRemove={
                  removeNewImage
                }
              />
            )}

            {!imagePreview &&
              currentEvent
                .cover_image_url &&
              !removeCurrentCover && (
                <CoverPreview
                  imageUrl={
                    currentEvent
                      .cover_image_url
                  }
                  alt={
                    currentEvent.title
                  }
                  buttonText="Remove Current Photo"
                  disabled={
                    isSaving
                  }
                  onRemove={
                    handleRemoveCurrentCover
                  }
                />
              )}

            {removeCurrentCover &&
              !imagePreview && (
                <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  <p>
                    Cover photo
                    itaondolewa baada ya
                    kuhifadhi.
                  </p>

                  <button
                    type="button"
                    disabled={
                      isSaving
                    }
                    onClick={
                      restoreCurrentCover
                    }
                    className="mt-3 rounded-lg bg-amber-200 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-60"
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
              disabled={
                isSaving
              }
            />

            <button
              type="button"
              disabled={
                isSaving
              }
              onClick={() =>
                router.push(
                  "/events"
                )
              }
              className="rounded-lg bg-gray-200 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-gray-200 pb-3">
      <h2 className="text-xl font-bold text-gray-800">
        {title}
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}

function ColorCircle({
  color,
}: {
  color: string;
}) {
  return (
    <span
      className="h-7 w-7 rounded-full border border-black/10"
      style={{
        backgroundColor:
          color,
      }}
    />
  );
}

function ColorPicker({
  label,
  name,
  value,
  disabled,
  onChange,
}: {
  label: string;

  name:
    | "theme_primary_color"
    | "theme_secondary_color"
    | "theme_accent_color";

  value: string;
  disabled: boolean;

  onChange: (
    event:
      ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <div className="flex items-center gap-3">
        <input
          id={name}
          name={name}
          type="color"
          value={value}
          disabled={
            disabled
          }
          onChange={
            onChange
          }
          className="h-12 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 disabled:opacity-60"
        />

        <input
          name={name}
          type="text"
          value={value}
          maxLength={7}
          disabled={
            disabled
          }
          onChange={
            onChange
          }
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-3 font-mono uppercase text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
        />
      </div>
    </div>
  );
}

function MessagePreview({
  message,
  primaryColor,
  secondaryColor,
  accentColor,
}: {
  message: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}) {
  return (
    <div
      className="relative mt-6 overflow-hidden rounded-3xl border shadow-sm"
      style={{
        borderColor:
          `${accentColor}55`,

        background:
          `linear-gradient(` +
          `145deg, #ffffff 0%, ` +
          `${secondaryColor} 100%)`,
      }}
    >
      <div
        className="absolute left-0 top-0 h-1 w-full"
        style={{
          background:
            `linear-gradient(` +
            `90deg, ` +
            `${primaryColor}, ` +
            `${accentColor})`,
        }}
      />

      <div className="px-5 pb-5 pt-7 text-center">
        <div
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-full font-serif text-3xl shadow-sm"
          style={{
            backgroundColor:
              secondaryColor,

            color:
              primaryColor,
          }}
        >
          “
        </div>

        <p className="mt-4 whitespace-pre-line text-base font-medium leading-8 text-slate-700">
          {message}
        </p>
      </div>

      <div className="flex items-center gap-3 px-6">
        <div className="h-px flex-1 bg-slate-300" />

        <span
          style={{
            color:
              accentColor,
          }}
        >
          ✦
        </span>

        <div className="h-px flex-1 bg-slate-300" />
      </div>

      <div className="px-5 pb-6 pt-4 text-center">
        <p
          className="text-2xl font-bold"
          style={{
            color:
              primaryColor,
          }}
        >
          Guest Name
        </p>

        <div
          className="mx-auto mt-3 h-1 w-12 rounded-full"
          style={{
            backgroundColor:
              accentColor,
          }}
        />
      </div>
    </div>
  );
}

function ThemePreview({
  template,
  title,
  dressCode,
  primaryColor,
  secondaryColor,
  accentColor,
}: {
  template: InvitationTemplate;
  title: string;
  dressCode: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}) {
  if (template === "midnight_luxe") {
    return (
      <div className="relative mt-7 min-h-80 overflow-hidden border border-white/20 bg-slate-950 shadow-xl">
        <div className="absolute inset-0 opacity-75" style={{ background: `radial-gradient(circle at 78% 18%, ${accentColor}88, transparent 34%), linear-gradient(145deg, ${primaryColor}, #080b13 70%)` }} />
        <svg viewBox="0 0 500 300" className="absolute inset-0 h-full w-full opacity-40" aria-hidden="true"><path d="M15 275C110 95 265 45 485 22M100 300C185 145 315 95 500 80" fill="none" stroke={accentColor} strokeWidth="1" /></svg>
        <div className="absolute bottom-6 left-6 right-20 border-l-4 p-6 backdrop-blur-sm" style={{ borderColor: accentColor, backgroundColor: `${secondaryColor}E8` }}>
          <p className="text-[8px] font-bold uppercase tracking-[0.38em]" style={{ color: primaryColor }}>Midnight Luxe · Invitation Preview</p>
          <h3 className="mt-3 break-words font-serif text-4xl leading-none" style={{ color: primaryColor }}>{title || "Event Title"}</h3>
          <p className="mt-4 text-xs text-slate-600">{dressCode || "Your dress code"}</p>
        </div>
      </div>
    );
  }

  if (template === "african_royal") {
    return (
      <div className="mt-7 overflow-hidden border-4 border-white shadow-lg" style={{ backgroundColor: primaryColor }}>
        <div className="grid min-h-72 grid-cols-[1.1fr_0.9fr]">
          <div className="relative flex flex-col justify-between overflow-hidden p-7 text-white">
            <div className="absolute -left-12 top-8 h-36 w-36 rotate-45 border-[10px] opacity-25" style={{ borderColor: accentColor }} />
            <p className="relative text-[8px] font-bold uppercase tracking-[0.35em]">African Royal · Invitation Preview</p>
            <h3 className="relative break-words font-serif text-4xl leading-none">{title || "Event Title"}</h3>
            <p className="relative text-xs">{dressCode || "Your dress code"}</p>
          </div>
          <div className="relative m-3 ml-0 overflow-hidden" style={{ backgroundColor: secondaryColor }}>
            <svg viewBox="0 0 120 180" className="absolute inset-0 h-full w-full opacity-55" aria-hidden="true">
              <path d="M0 30h30V0h30v30h30V0h30v60H90v30h30v30H90v60H60v-30H30v30H0v-60h30V90H0z" fill="none" stroke={accentColor} strokeWidth="5" />
            </svg>
            <div className="absolute bottom-5 right-5 h-24 w-16 border-4 border-white/80" style={{ backgroundColor: primaryColor }} />
          </div>
        </div>
      </div>
    );
  }

  if (template === "minimal_ivory") {
    return (
      <div className="relative mt-7 overflow-hidden border border-[#d8cdbb] bg-[#fbf7ed] p-3 shadow-sm">
        <div className="border border-[#d8cdbb] px-6 py-9 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.38em]" style={{ color: primaryColor }}>
            Invitation Preview
          </p>
          <div className="mx-auto mt-5 h-16 w-12 rounded-[50%] border" style={{ borderColor: accentColor, backgroundColor: secondaryColor }} />
          <h3 className="mt-5 break-words font-serif text-4xl leading-none" style={{ color: primaryColor }}>
            {title || "Event Title"}
          </h3>
          <div className="mx-auto mt-6 h-px w-20" style={{ backgroundColor: accentColor }} />
          <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">
            01 Ceremony · 02 Reception
          </p>
          <p className="mt-4 font-serif text-sm text-slate-700">
            {dressCode || "Your dress code"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-7 overflow-hidden rounded-3xl border border-slate-200 shadow-sm"
      style={{
        backgroundColor:
          secondaryColor,
      }}
    >
      <div
        className="h-3"
        style={{
          background:
            `linear-gradient(` +
            `90deg, ` +
            `${primaryColor}, ` +
            `${accentColor})`,
        }}
      />

      <div className="p-6 text-center">
        <p
          className="text-xs font-bold uppercase tracking-[0.25em]"
          style={{
            color:
              accentColor,
          }}
        >
          Invitation Preview
        </p>

        <h3
          className="mt-3 text-3xl font-bold"
          style={{
            color:
              primaryColor,
          }}
        >
          {title ||
            "Event Title"}
        </h3>

        <div className="mx-auto mt-4 max-w-sm rounded-2xl bg-white/90 p-4 shadow-sm">
          <p
            className="text-xl font-bold"
            style={{
              color:
                primaryColor,
            }}
          >
            Guest Name
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Dress code:{" "}
            {dressCode ||
              "Your dress code"}
          </p>
        </div>

        <button
          type="button"
          className="mt-5 rounded-xl px-6 py-3 font-bold text-white shadow-sm"
          style={{
            backgroundColor:
              primaryColor,
          }}
        >
          RSVP
        </button>
      </div>
    </div>
  );
}

function CoverPreview({
  imageUrl,
  alt,
  buttonText,
  disabled,
  onRemove,
}: {
  imageUrl: string;
  alt: string;
  buttonText: string;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <div className="relative">
        <img
          src={imageUrl}
          alt={alt}
          className="h-64 w-full rounded-xl object-cover"
        />

        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="absolute right-3 top-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700 disabled:opacity-60"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
