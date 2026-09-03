"use client";

import { useAppLanguage } from "@/lib/i18n/useAppLanguage";

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
        "#F1E7D2",

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
        "#EAEFDD",

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
        "#F6DFD8",

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
        "#E6EAF2",

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
        "#F0E1CB",

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
        "#EEDFBB",

      accentColor:
        "#C7A35A",
    },

    {
      id:
        "forest-berry-blush",

      name:
        "Forest, Berry & Blush",

      dressCode:
        "Deep forest green, deep red, blush pink",

      primaryColor:
        "#1B4332",

      secondaryColor:
        "#FDF6F0",

      accentColor:
        "#7A0C0C",
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
  const { language } = useAppLanguage();

  return (
    <div>
      <div className="mb-4">
        <h3 className="sep-card-title">
          {language === "sw"
            ? "Palette ya Rangi na Background ya Kadi"
            : "Card Background & Colour Palette"}
        </h3>

        <p className="sep-secondary mt-1 leading-6">
          {language === "sw"
            ? "Chagua palette ili kuweka background ya kadi, rangi za msisitizo, na dress code kwa pamoja."
            : "Choose a palette to set your card's background colour, accent colours, and dress code together."}
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
                    ? "border-emerald-600 bg-emerald-50 shadow-md"
                    : "border-[#e7e1d7] bg-white hover:border-emerald-300 hover:shadow-sm"
                }`}
              >
                <div
                  className="relative h-12 w-full rounded-xl border border-black/10 shadow-inner"
                  style={{
                    backgroundColor:
                      palette
                        .secondaryColor,
                  }}
                >
                  <span className="absolute bottom-1 left-2 text-[9px] font-bold uppercase tracking-wide text-black/40">
                    {language === "sw" ? "Background" : "Background"}
                  </span>
                </div>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="flex gap-1.5">
                    <span
                      title={language === "sw" ? "Rangi Kuu" : "Primary"}
                      className="h-6 w-6 rounded-full border border-black/10 shadow-sm"
                      style={{
                        backgroundColor:
                          palette
                            .primaryColor,
                      }}
                    />

                    <span
                      title={language === "sw" ? "Msisitizo" : "Accent"}
                      className="h-6 w-6 rounded-full border border-black/10 shadow-sm"
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
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-[#e7e1d7] bg-white"
                    }`}
                  >
                    {isSelected
                      ? "✓"
                      : ""}
                  </span>
                </div>

                <p className="mt-3 font-bold text-slate-900">
                  {
                    palette.name
                  }
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
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
