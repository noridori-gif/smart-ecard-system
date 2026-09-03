"use client";

import { useRef, type CSSProperties } from "react";
import Image from "next/image";
import type { CustomLayoutElement, CustomLayoutElementKey } from "@/services/invitationLayoutService";

const REFERENCE_WIDTH = 1080;

const ELEMENT_LABELS: Record<CustomLayoutElementKey, { en: string; sw: string }> = {
  guest_name: { en: "Guest Name", sw: "Jina la Mgeni" },
  venue: { en: "Venue", sw: "Eneo" },
  datetime: { en: "Date / Time", sw: "Tarehe / Muda" },
  qr: { en: "QR Code", sw: "QR Code" },
};

type Copy = {
  background: string; dropBackground: string; imageLimit: string; replacePhoto: string; removePhoto: string; restorePhoto: string;
  noBackground: string; x: string; y: string; width: string; height: string; fontSize: string; align: string; color: string;
  left: string; center: string; right: string; photoType: string; photoSize: string;
};
const COPY: Record<"en" | "sw", Copy> = {
  en: { background: "Invitation Background", dropBackground: "Drop your designed invitation image here, or click to browse", imageLimit: "Image files up to 8 MB", replacePhoto: "Replace image", removePhoto: "Remove image", restorePhoto: "Restore image", noBackground: "Upload a background to preview element positions.", x: "X %", y: "Y %", width: "Width %", height: "Height %", fontSize: "Font size", align: "Align", color: "Color", left: "Left", center: "Center", right: "Right", photoType: "Please select an image file.", photoSize: "The image must not exceed 8 MB." },
  sw: { background: "Picha ya Mwaliko", dropBackground: "Dondosha picha ya muundo wako wa mwaliko hapa, au bofya kuchagua", imageLimit: "Picha zisizozidi MB 8", replacePhoto: "Badilisha picha", removePhoto: "Ondoa picha", restorePhoto: "Rudisha picha", noBackground: "Pakia picha ya background ili kuona nafasi za vipengele.", x: "X %", y: "Y %", width: "Upana %", height: "Urefu %", fontSize: "Ukubwa wa maandishi", align: "Mpangilio", color: "Rangi", left: "Kushoto", center: "Katikati", right: "Kulia", photoType: "Tafadhali chagua file la picha.", photoSize: "Picha isizidi MB 8." },
};

type Props = {
  language: "sw" | "en";
  disabled: boolean;
  shownBackgroundUrl: string;
  backgroundFile: File | null;
  backgroundRemoved: boolean;
  currentBackgroundUrl?: string | null;
  onBackgroundFile: (file: File | null, previewUrl: string) => void;
  onBackgroundRemoved: (removed: boolean) => void;
  elements: CustomLayoutElement[];
  onElementsChange: (elements: CustomLayoutElement[]) => void;
  guestNameSample: string;
  venueSample: string;
  datetimeSample: string;
};

export default function CustomInvitationLayoutEditor(props: Props) {
  const copy = COPY[props.language];
  const fileRef = useRef<HTMLInputElement>(null);

  const chooseFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { window.alert(copy.photoType); return; }
    if (file.size > 8 * 1024 * 1024) { window.alert(copy.photoSize); return; }
    props.onBackgroundFile(file, URL.createObjectURL(file));
    props.onBackgroundRemoved(false);
  };

  const updateElement = (key: CustomLayoutElementKey, patch: Partial<CustomLayoutElement>) => {
    props.onElementsChange(props.elements.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const sampleText: Record<CustomLayoutElementKey, string> = {
    guest_name: props.guestNameSample,
    venue: props.venueSample,
    datetime: props.datetimeSample,
    qr: "",
  };

  return (
    <div className="mt-4 space-y-4">
      <div>
        <p className="sep-label mb-1.5">{copy.background}</p>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={props.disabled} onChange={(event) => chooseFile(event.target.files?.[0])} className="sr-only" />
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileRef.current?.click(); }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }}
          className="rounded-2xl border-2 border-dashed border-[#e7e1d7] bg-stone-50 p-4 outline-none hover:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        >
          {props.shownBackgroundUrl ? (
            <div className="flex items-center gap-4">
              <Image src={props.shownBackgroundUrl} alt={copy.background} width={96} height={80} unoptimized className="h-20 w-24 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{props.backgroundFile?.name || copy.background}</p>
                <div className="mt-2 flex gap-4 text-xs font-bold">
                  <span className="text-emerald-700">{copy.replacePhoto}</span>
                  <button type="button" onClick={(event) => { event.stopPropagation(); props.onBackgroundFile(null, ""); props.onBackgroundRemoved(Boolean(props.currentBackgroundUrl)); }} className="text-red-700">{copy.removePhoto}</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-5 text-center">
              <p className="font-bold text-slate-800">{copy.dropBackground}</p>
              <p className="mt-1 text-xs text-slate-500">{copy.imageLimit}</p>
              {props.backgroundRemoved && <button type="button" onClick={(event) => { event.stopPropagation(); props.onBackgroundRemoved(false); }} className="mt-3 font-bold text-emerald-700">{copy.restorePhoto}</button>}
            </div>
          )}
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border border-[#e7e1d7] bg-stone-950" style={{ containerType: "inline-size" } as unknown as CSSProperties}>
        {props.shownBackgroundUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={props.shownBackgroundUrl} alt="" className="block w-full" />
            {props.elements.map((element) => (
              <div
                key={element.key}
                className="absolute flex items-center justify-center overflow-hidden border-2 border-dashed border-emerald-400/90 bg-emerald-400/10"
                style={{
                  left: `${element.xPct}%`, top: `${element.yPct}%`, width: `${element.widthPct}%`, height: `${element.heightPct}%`,
                  fontSize: element.key === "qr" ? undefined : `${((element.fontSize ?? 32) / REFERENCE_WIDTH) * 100}cqw`,
                  color: element.color ?? "#FFFFFF", fontWeight: 700, textAlign: element.align ?? "left",
                  justifyContent: element.align === "right" ? "flex-end" : element.align === "center" ? "center" : "flex-start",
                }}
              >
                {element.key === "qr" ? <span className="text-[10px] font-black text-emerald-200">QR</span> : sampleText[element.key]}
              </div>
            ))}
          </>
        ) : (
          <p className="p-8 text-center text-sm font-semibold text-white/70">{copy.noBackground}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {props.elements.map((element) => (
          <ElementFields key={element.key} language={props.language} element={element} onChange={(patch) => updateElement(element.key, patch)} disabled={props.disabled} />
        ))}
      </div>
    </div>
  );
}

function ElementFields({ language, element, onChange, disabled }: { language: "sw" | "en"; element: CustomLayoutElement; onChange: (patch: Partial<CustomLayoutElement>) => void; disabled: boolean }) {
  const copy = COPY[language];
  const label = ELEMENT_LABELS[element.key][language];
  const isText = element.key !== "qr";

  return (
    <div className="rounded-2xl border border-[#e7e1d7] bg-stone-50 p-3">
      <p className="mb-2 text-sm font-black">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumberField label={copy.x} value={element.xPct} min={0} max={100} disabled={disabled} onChange={(value) => onChange({ xPct: value })} />
        <NumberField label={copy.y} value={element.yPct} min={0} max={100} disabled={disabled} onChange={(value) => onChange({ yPct: value })} />
        <NumberField label={copy.width} value={element.widthPct} min={1} max={100} disabled={disabled} onChange={(value) => onChange({ widthPct: value })} />
        <NumberField label={copy.height} value={element.heightPct} min={1} max={100} disabled={disabled} onChange={(value) => onChange({ heightPct: value })} />
      </div>
      {isText && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <NumberField label={copy.fontSize} value={element.fontSize ?? 32} min={8} max={200} disabled={disabled} onChange={(value) => onChange({ fontSize: value })} />
          <label className="sep-label text-xs">{copy.align}
            <select value={element.align ?? "left"} disabled={disabled} onChange={(event) => onChange({ align: event.target.value as CustomLayoutElement["align"] })} className="sep-control mt-1 text-sm">
              <option value="left">{copy.left}</option>
              <option value="center">{copy.center}</option>
              <option value="right">{copy.right}</option>
            </select>
          </label>
          <label className="sep-label text-xs">{copy.color}
            <input type="color" value={element.color ?? "#FFFFFF"} disabled={disabled} onChange={(event) => onChange({ color: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-[#e7e1d7]" />
          </label>
        </div>
      )}
    </div>
  );
}

function NumberField({ label, value, min, max, disabled, onChange }: { label: string; value: number; min: number; max: number; disabled: boolean; onChange: (value: number) => void }) {
  return (
    <label className="sep-label text-xs">{label}
      <input type="number" value={value} min={min} max={max} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} className="sep-control mt-1 text-sm" />
    </label>
  );
}
