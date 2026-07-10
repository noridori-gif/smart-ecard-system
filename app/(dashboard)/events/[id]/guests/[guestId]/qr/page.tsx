"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { getGuestById } from "@/services/guestService";

export default function GuestQRPage() {
  const params = useParams();

  const guestId = Number(params.guestId);

  const [guest, setGuest] = useState<any>(null);

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
      <div className="p-10">
        Loading QR...
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-xl">

      <div className="rounded-xl bg-white p-8 shadow">

        <h1 className="text-3xl font-bold text-center">
          Guest QR Code
        </h1>

        <p className="mt-3 text-center text-gray-600">
          {guest.full_name}
        </p>

        <div className="mt-8 flex justify-center">

          <QRCodeSVG
            value={guest.qr_token}
            size={280}
          />

        </div>

        <div className="mt-8 space-y-2">

          <p>
            <strong>Category:</strong> {guest.category}
          </p>

          <p>
            <strong>Allowed Guests:</strong> {guest.allowed_guests}
          </p>

          <p>
            <strong>Status:</strong> {guest.status}
          </p>

        </div>

      </div>

    </section>
  );
}