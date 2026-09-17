import "server-only";

// Separate from lib/financialWhatsAppConfig.ts on purpose: that file is the
// pledge/contributor (financial-suite) domain's template config. This one is
// the guest/invitation domain's "thank you for attending/supporting" send,
// which targets every invited guest of an event, not pledge contributors.

export type GuestThankYouLanguage = "sw" | "en";

export type GuestThankYouTemplateConfig = {
  configured: boolean;
  languageCode: string;
  templateName: string | null;
};

function value(name: string) {
  return process.env[name]?.trim() || null;
}

/**
 * Approved WhatsApp template name for the guest thank-you send. Must be
 * created and approved in Meta Business Manager before it can be used
 * outside the 24-hour customer-service window -- this only reads whichever
 * name has been configured, it does not verify Meta has approved it.
 */
export function getGuestThankYouWhatsAppTemplate(
  language: GuestThankYouLanguage
): GuestThankYouTemplateConfig {
  const suffix = language === "sw" ? "SW" : "EN";
  const templateName = value(`WHATSAPP_GUEST_THANK_YOU_TEMPLATE_${suffix}`);
  const languageCode =
    value(`WHATSAPP_GUEST_THANK_YOU_TEMPLATE_LANGUAGE_${suffix}`) ??
    (language === "sw" ? "sw" : "en_US");

  return {
    configured: Boolean(templateName),
    languageCode,
    templateName,
  };
}

export function getGuestThankYouWhatsAppReadiness() {
  const sw = getGuestThankYouWhatsAppTemplate("sw");
  const en = getGuestThankYouWhatsAppTemplate("en");

  return {
    whatsappConfigured: Boolean(
      value("WHATSAPP_ACCESS_TOKEN") && value("WHATSAPP_PHONE_NUMBER_ID")
    ),
    templateSwConfigured: sw.configured,
    templateEnConfigured: en.configured,
  };
}
