type Language = "sw" | "en";

type DressCodeSwatchesProps = {
  dressCode: string | null;
  language: Language;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  className?: string;
};

export default function DressCodeSwatches({
  dressCode,
  language,
  primaryColor,
  secondaryColor,
  accentColor,
  className = "",
}: DressCodeSwatchesProps) {
  if (!dressCode) return null;

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.25em] opacity-60">
          {language === "sw" ? "Mavazi" : "Dress Code"}
        </p>
        <p className="mt-1 font-serif text-xl">{dressCode}</p>
      </div>

      <div className="flex gap-2">
        <span className="h-7 w-7 rounded-full border border-white/30 shadow-sm" style={{ backgroundColor: primaryColor }} />
        <span className="h-7 w-7 rounded-full border border-white/30 shadow-sm" style={{ backgroundColor: secondaryColor }} />
        <span className="h-7 w-7 rounded-full border border-white/30 shadow-sm" style={{ backgroundColor: accentColor }} />
      </div>
    </div>
  );
}
