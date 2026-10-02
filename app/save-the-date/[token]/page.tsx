import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getSaveTheDateCardByToken, normalizeVariant } from "@/services/saveTheDateService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ token: string }> };

export const metadata: Metadata = { title: "Save the Date", robots: { index: false, follow: false } };

// The page the Save the Date SMS links to: just the card. No pass, QR or RSVP -- the formal
// invitation (/invite/[token]) is a separate link sent later.
export default async function SaveTheDatePage({ params }: PageProps) {
  const { token } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) notFound();
  const card = await getSaveTheDateCardByToken(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }), token);
  if (!card) notFound();

  const navy = normalizeVariant(card.delivery.variant) === "navy";
  const cardUrl = `/api/save-the-date/${token}/card`;

  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 16px", background: navy ? "#0c1f3d" : "#f5eee2", color: navy ? "#efe6d6" : "#0c1f3d" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cardUrl} alt={`Save the Date — ${card.event.title}`} width={1080} height={1536} style={{ width: "100%", maxWidth: 540, height: "auto", borderRadius: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.25)" }} />
      <a href={cardUrl} download="save-the-date.jpg" style={{ fontWeight: 700, color: "inherit" }}>
        {card.event.language === "en" ? "Download the card" : "Pakua kadi"}
      </a>
    </main>
  );
}
