import { supabase } from "@/lib/supabase";

export type CustomLayoutElementKey = "guest_name" | "venue" | "datetime" | "qr";
export type CustomLayoutAlign = "left" | "center" | "right";

export type CustomLayoutElement = {
  key: CustomLayoutElementKey;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  fontSize: number | null;
  align: CustomLayoutAlign | null;
  color: string | null;
};

// Non-overlapping starting positions so the numeric editor doesn't open on a
// pile of zeros: name/venue/date stacked bottom-left, QR bottom-right.
export const DEFAULT_CUSTOM_LAYOUT: CustomLayoutElement[] = [
  { key: "guest_name", xPct: 6, yPct: 70, widthPct: 60, heightPct: 8, fontSize: 42, align: "left", color: "#FFFFFF" },
  { key: "venue", xPct: 6, yPct: 79, widthPct: 60, heightPct: 6, fontSize: 26, align: "left", color: "#FFFFFF" },
  { key: "datetime", xPct: 6, yPct: 86, widthPct: 60, heightPct: 6, fontSize: 26, align: "left", color: "#FFFFFF" },
  { key: "qr", xPct: 72, yPct: 70, widthPct: 22, heightPct: 22, fontSize: null, align: null, color: null },
];

const ELEMENT_KEYS: CustomLayoutElementKey[] = ["guest_name", "venue", "datetime", "qr"];

function defaultFor(key: CustomLayoutElementKey): CustomLayoutElement {
  return DEFAULT_CUSTOM_LAYOUT.find((item) => item.key === key)!;
}

type LayoutElementRow = {
  element_key: CustomLayoutElementKey;
  x_pct: number;
  y_pct: number;
  width_pct: number;
  height_pct: number;
  font_size: number | null;
  align: CustomLayoutAlign | null;
  color: string | null;
};

export async function getCustomInvitationLayout(eventId: number): Promise<CustomLayoutElement[]> {
  const { data, error } = await supabase
    .from("event_invitation_layout_elements")
    .select("element_key,x_pct,y_pct,width_pct,height_pct,font_size,align,color")
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LayoutElementRow[];

  return ELEMENT_KEYS.map((key) => {
    const row = rows.find((item) => item.element_key === key);
    if (!row) return defaultFor(key);

    return {
      key,
      xPct: Number(row.x_pct),
      yPct: Number(row.y_pct),
      widthPct: Number(row.width_pct),
      heightPct: Number(row.height_pct),
      fontSize: row.font_size === null ? null : Number(row.font_size),
      align: row.align,
      color: row.color,
    };
  });
}

function clampPct(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export async function saveCustomInvitationLayout(
  eventId: number,
  elements: CustomLayoutElement[]
): Promise<void> {
  const rows = ELEMENT_KEYS.map((key) => {
    const element = elements.find((item) => item.key === key) ?? defaultFor(key);

    return {
      event_id: eventId,
      element_key: key,
      x_pct: clampPct(element.xPct, 0, 100),
      y_pct: clampPct(element.yPct, 0, 100),
      width_pct: clampPct(element.widthPct, 1, 100),
      height_pct: clampPct(element.heightPct, 1, 100),
      font_size: element.fontSize,
      align: element.align,
      color: element.color?.trim() || null,
    };
  });

  const { error } = await supabase
    .from("event_invitation_layout_elements")
    .upsert(rows, { onConflict: "event_id,element_key" });

  if (error) throw new Error(error.message);
}
