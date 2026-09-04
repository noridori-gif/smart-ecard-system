"use client";

import { useEffect, useMemo, useState } from "react";

import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import MessageTemplateEditor from "@/components/ui/MessageTemplateEditor";

import { DEFAULT_INVITATION_TEMPLATE } from "@/services/eventService";
import type { InvitationWithDetails } from "@/services/invitationService";
import {
  INVITATION_SMS_TEMPLATE_PLACEHOLDERS,
  buildInvitationSmsTemplateValues,
  buildSmsMessage,
  renderInvitationSmsTemplate,
} from "@/services/invitationMessageService";
import {
  getInvitationSmsSettings,
  saveInvitationSmsSettings,
} from "@/services/invitationSmsSettingsService";

export default function InvitationSmsSettingsPanel({
  eventId,
  eventTitle,
  language,
  onClose,
}: {
  eventId: number;
  eventTitle: string;
  language: "sw" | "en";
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    void getInvitationSmsSettings(eventId)
      .then((settings) => {
        if (!cancelled) {
          setMessage(settings.custom_invitation_sms_message ?? "");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Invitation SMS settings could not be loaded."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // A representative invitation for the live preview -- it never gets sent, it
  // only feeds the same builders the real send path uses so the preview and
  // character/segment count reflect an actual invite link's length, not a guess.
  const sampleInvitation = useMemo<InvitationWithDetails>(
    () => ({
      id: 0,
      event_id: eventId,
      guest_id: 0,
      invitation_token: "00000000-0000-4000-8000-000000000000",
      invitation_status: "sent",
      rsvp_status: "pending",
      created_at: new Date().toISOString(),
      language,
      invitation_template: DEFAULT_INVITATION_TEMPLATE,
      event_pass_id: "ABC123",
      allowed_guests: 2,
      events: {
        title: eventTitle || "Your Event",
        event_type: "",
        bride_name: null,
        groom_name: null,
        language,
        invitation_template: DEFAULT_INVITATION_TEMPLATE,
        ceremony_title: null,
        ceremony_date: null,
        ceremony_time: null,
        ceremony_venue: null,
        ceremony_map_url: null,
        event_date: "2026-09-12",
        event_time: "18:00",
        venue: "Noble Hall Kimara",
        reception_map_url: null,
        dress_code: null,
        cover_image_url: null,
        theme_primary_color: null,
        theme_secondary_color: null,
        theme_accent_color: null,
        invitation_message: null,
      },
      guests: {
        full_name: "Ann Anna",
        phone: null,
        email: null,
        category: null,
        event_pass_id: "ABC123",
        allowed_guests: 2,
      },
    }),
    [eventId, eventTitle, language]
  );

  async function save() {
    try {
      setSaving(true);
      setError("");
      await saveInvitationSmsSettings(eventId, message.trim() || null);
      setNotice("Invitation SMS wording saved.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invitation SMS wording could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  const siteOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://smarteventpass.co.tz";

  return (
    <Dialog titleId="invitation-sms-settings-title" onClose={onClose} className="max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="invitation-sms-settings-title" className="text-xl font-bold text-slate-950">
            Customize SMS wording
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {eventTitle ? `For ${eventTitle}. ` : ""}
            Leave blank to keep sending today&apos;s default wording. This only changes the SMS —
            WhatsApp invitations are unaffected.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      {loading ? (
        <p role="status" className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-slate-600">
          Loading...
        </p>
      ) : (
        <div className="mt-4">
          <MessageTemplateEditor
            label="Guest Invitation SMS"
            value={message}
            onChange={(value) => {
              setMessage(value);
              setNotice("");
            }}
            placeholders={INVITATION_SMS_TEMPLATE_PLACEHOLDERS}
            renderPreview={(template) =>
              renderInvitationSmsTemplate(
                template,
                buildInvitationSmsTemplateValues(sampleInvitation, siteOrigin)
              )
            }
            buildDefault={() => buildSmsMessage(sampleInvitation, siteOrigin)}
            prominentSegmentWarning
          />
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
          Close
        </Button>
        <Button type="button" variant="primary" loading={saving} disabled={loading || saving} onClick={() => void save()}>
          Save
        </Button>
      </div>
    </Dialog>
  );
}
