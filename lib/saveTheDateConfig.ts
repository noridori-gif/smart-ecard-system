import "server-only";

// Same shape as lib/guestThankYouConfig.ts. The Save the Date needs its own approved template: the
// invitation template (WHATSAPP_TEMPLATE_NAME_*) carries time, Pass ID and guest count, which a
// Save the Date must not show. Until WHATSAPP_SAVE_THE_DATE_TEMPLATE_* is set, sends go by SMS.

export type SaveTheDateTemplateConfig = {
  configured: boolean;
  languageCode: string;
  templateName: string | null;
};

function value(name: string) {
  return process.env[name]?.trim() || null;
}

/**
 * Approved WhatsApp template for the Save the Date: an IMAGE header (the card) and a body with
 * {{1}} guest name, {{2}} couple, {{3}} date, {{4}} venue. This only reads the configured name; it
 * does not verify Meta has approved it.
 */
export function getSaveTheDateWhatsAppTemplate(language: "sw" | "en"): SaveTheDateTemplateConfig {
  const suffix = language === "sw" ? "SW" : "EN";
  const templateName = value(`WHATSAPP_SAVE_THE_DATE_TEMPLATE_${suffix}`);
  const languageCode = value(`WHATSAPP_SAVE_THE_DATE_TEMPLATE_LANGUAGE_${suffix}`) ?? (language === "sw" ? "sw" : "en_US");
  const whatsappReady = Boolean(value("WHATSAPP_ACCESS_TOKEN") && value("WHATSAPP_PHONE_NUMBER_ID"));
  return { configured: Boolean(templateName) && whatsappReady, languageCode, templateName };
}
