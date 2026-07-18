"use client";

export type EventThemePalette = {
  id: string;
  name: string;
  dressCode: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

export const EVENT_THEME_PALETTES: EventThemePalette[] =
  [
    {
      id: "royal-blue-gold",

      name:
        "Royal Blue & Gold",

      dressCode:
        "Royal blue, gold, pale white",

      primaryColor:
        "#12305A",

      secondaryColor:
        "#F7F3E8",

      accentColor:
        "#D4AF37",
    },

    {
      id: "emerald-gold",

      name:
        "Emerald & Gold",

      dressCode:
        "Emerald green, gold, cream",

      primaryColor:
        "#08664F",

      secondaryColor:
        "#F8F3E6",

      accentColor:
        "#C9A227",
    },

    {
      id:
        "burgundy-champagne",

      name:
        "Burgundy & Champagne",

      dressCode:
        "Burgundy, blush, champagne",

      primaryColor:
        "#731F35",

      secondaryColor:
        "#F9EEE9",

      accentColor:
        "#C7A36A",
    },

    {
      id: "navy-silver",

      name:
        "Navy & Silver",

      dressCode:
        "Navy blue, silver, white",

      primaryColor:
        "#14213D",

      secondaryColor:
        "#F3F5F8",

      accentColor:
        "#A7B0BE",
    },

    {
      id:
        "terracotta-sage",

      name:
        "Terracotta & Sage",

      dressCode:
        "Terracotta, sage green, cream",

      primaryColor:
        "#A34F38",

      secondaryColor:
        "#F8F1E7",

      accentColor:
        "#87966B",
    },

    {
      id:
        "black-champagne",

      name:
        "Black & Champagne",

      dressCode:
        "Black, gold, champagne",

      primaryColor:
        "#171717",

      secondaryColor:
        "#F7F0E4",

      accentColor:
        "#C7A35A",
    },
  ];

type ThemePalettePickerProps = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  disabled?: boolean;

  onSelect: (
    palette: EventThemePalette
  ) => void;
};

function normalizeColor(
  value: string
) {
  return value
    .trim()
    .toUpperCase();
}

export default function ThemePalettePicker({
  primaryColor,
  secondaryColor,
  accentColor,
  disabled = false,
  onSelect,
}: ThemePalettePickerProps) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="font-bold text-gray-900">
          Dress Code Colour Palette
        </h3>

        <p className="mt-1 text-sm leading-6 text-gray-500">
          Chagua palette ili rangi
          za card na dress code
          zibadilike pamoja.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {EVENT_THEME_PALETTES.map(
          (palette) => {
            const isSelected =
              normalizeColor(
                primaryColor
              ) ===
                normalizeColor(
                  palette
                    .primaryColor
                ) &&
              normalizeColor(
                secondaryColor
              ) ===
                normalizeColor(
                  palette
                    .secondaryColor
                ) &&
              normalizeColor(
                accentColor
              ) ===
                normalizeColor(
                  palette
                    .accentColor
                );

            return (
              <button
                key={
                  palette.id
                }
                type="button"
                disabled={
                  disabled
                }
                onClick={() =>
                  onSelect(
                    palette
                  )
                }
                className={`rounded-2xl border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-1.5">
                    <span
                      className="h-8 w-8 rounded-full border border-black/10 shadow-sm"
                      style={{
                        backgroundColor:
                          palette
                            .primaryColor,
                      }}
                    />

                    <span
                      className="h-8 w-8 rounded-full border border-black/10 shadow-sm"
                      style={{
                        backgroundColor:
                          palette
                            .secondaryColor,
                      }}
                    />

                    <span
                      className="h-8 w-8 rounded-full border border-black/10 shadow-sm"
                      style={{
                        backgroundColor:
                          palette
                            .accentColor,
                      }}
                    />
                  </div>

                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {isSelected
                      ? "✓"
                      : ""}
                  </span>
                </div>

                <p className="mt-3 font-bold text-gray-900">
                  {
                    palette.name
                  }
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {
                    palette
                      .dressCode
                  }
                </p>
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}