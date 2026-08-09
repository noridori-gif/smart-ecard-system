"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { getGuestById, type Guest } from "@/services/guestService";

export default function GuestQRPage() {
  const params = useParams();

  const guestId = Number(params.guestId);

  const [guest, setGuest] = useState<Guest | null>(null);

  useEffect(() => {
    async function loadGuest() {
      const data = await getGuestById(guestId);
      setGuest(data);
    }

    if (guestId) {
      loadGuest();
    }
  }, [guestId]);

  if (!guest) {
    return (
      <div className="p-10 text-slate-600">
        Loading QR...
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-xl">

      <div className="sep-card p-8">

        <h1 className="sep-page-title text-center">
          Guest QR Code
        </h1>

        <p className="mt-3 text-center text-slate-600">
          {guest.full_name}
        </p>

        <div className="mt-8 flex justify-center">

          <QRCodeSVG
            value={guest.qr_token}
            size={280}
          />

        </div>

        <div className="mt-8 space-y-2 text-slate-700">

          <p>
            <strong className="text-slate-900">Category:</strong> {guest.category}
          </p>

          <p>
            <strong className="text-slate-900">Allowed Guests:</strong> {guest.allowed_guests}
          </p>

          <p>
            <strong className="text-slate-900">Status:</strong> {guest.status}
          </p>

        </div>

      </div>

    </section>
  );
}
