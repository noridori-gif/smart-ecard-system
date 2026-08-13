import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Smart Event Pass — Tanzania's digital event and wedding guest management platform";

const logoDataUrl = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "logo.png")).toString("base64")}`;

/* eslint-disable @next/next/no-img-element -- ImageResponse renders its own image tree; next/image is unsupported here. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          background: "linear-gradient(135deg,#022c22,#07111f)",
          color: "white",
          fontFamily: "Arial, sans-serif",
          padding: "64px 72px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -90,
            top: -110,
            width: 420,
            height: 420,
            borderRadius: 999,
            border: "2px solid rgba(45,212,191,.35)",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", fontSize: 24, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: "#5eead4" }}>
          <img src={logoDataUrl} width={56} height={56} alt="" style={{ display: "flex", borderRadius: 14, marginRight: 20 }} />
          Smart Event Pass
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 62, lineHeight: 1.08, fontWeight: 800, letterSpacing: -2, maxWidth: 920 }}>
            Digital invitations. Smart access. Better events.
          </div>
          <div style={{ display: "flex", fontSize: 26, marginTop: 22, color: "#cbd5e1", maxWidth: 820 }}>
            Mialiko ya harusi, RSVP, pasi za QR na michango ya harusi mtandaoni — Tanzania
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 20, color: "#94a3b8" }}>smarteventpass.co.tz</div>
      </div>
    ),
    size
  );
}
