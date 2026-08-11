import "server-only";

export type FinancialMessageLanguage = "sw" | "en";
export type FinancialWhatsAppTemplateKind =
  | "reminder"
  | "daily_summary"
  | "pledge_acknowledgement"
  | "pledge_thank_you"
  | "meeting_invitation";

type TemplateConfig = {
  configured: boolean;
  languageCode: string;
  templateName: string | null;
};

function value(name: string) {
  return process.env[name]?.trim() || null;
}

export type FinancialWhatsAppTemplateOverride = {
  templateName: string | null;
  languageCode: string | null;
};

export function getFinancialWhatsAppTemplate(
  kind: FinancialWhatsAppTemplateKind,
  language: FinancialMessageLanguage,
  override?: FinancialWhatsAppTemplateOverride
): TemplateConfig {
  if (kind === "reminder" && override?.templateName) {
    return {
      configured: true,
      languageCode: override.languageCode || (language === "sw" ? "sw" : "en_US"),
      templateName: override.templateName,
    };
  }
  const suffix = language === "sw" ? "SW" : "EN";
  if (kind === "pledge_acknowledgement") {
    const templateName = value(`WHATSAPP_PLEDGE_ACKNOWLEDGEMENT_TEMPLATE_${suffix}`);
    return {
      configured: Boolean(templateName),
      languageCode: language === "sw" ? "sw" : "en_US",
      templateName,
    };
  }
  if (kind === "pledge_thank_you") {
    const templateName =
      value(`WHATSAPP_FINANCIAL_THANK_YOU_TEMPLATE_${suffix}`) ??
      (language === "sw"
        ? value("WHATSAPP_PLEDGE_THANK_YOU_TEMPLATE_NAME")
        : null);
    const languageCode =
      value(`WHATSAPP_FINANCIAL_THANK_YOU_TEMPLATE_LANGUAGE_${suffix}`) ??
      (language === "sw"
        ? value("WHATSAPP_PLEDGE_THANK_YOU_TEMPLATE_LANGUAGE")
        : null) ??
      (language === "sw" ? "sw" : "en_US");
    return { configured: Boolean(templateName), languageCode, templateName };
  }

  const prefix = kind === "reminder"
    ? "WHATSAPP_FINANCIAL_REMINDER_TEMPLATE"
    : kind === "meeting_invitation"
      ? "WHATSAPP_MEETING_INVITATION_TEMPLATE"
      : "WHATSAPP_DAILY_SUMMARY_TEMPLATE";
  const templateName = value(`${prefix}_${suffix}`);
  return {
    configured: Boolean(templateName),
    languageCode: language === "sw" ? "sw" : "en_US",
    templateName,
  };
}

export function getFinancialWhatsAppReadiness() {
  const reminderSw = getFinancialWhatsAppTemplate("reminder", "sw");
  const reminderEn = getFinancialWhatsAppTemplate("reminder", "en");
  const thankYouSw = getFinancialWhatsAppTemplate("pledge_thank_you", "sw");
  const thankYouEn = getFinancialWhatsAppTemplate("pledge_thank_you", "en");
  const acknowledgementSw = getFinancialWhatsAppTemplate("pledge_acknowledgement", "sw");
  const acknowledgementEn = getFinancialWhatsAppTemplate("pledge_acknowledgement", "en");
  return {
    whatsappConfigured: Boolean(
      value("WHATSAPP_ACCESS_TOKEN") && value("WHATSAPP_PHONE_NUMBER_ID")
    ),
    thankYouSwConfigured: thankYouSw.configured,
    thankYouEnConfigured: thankYouEn.configured,
    acknowledgementSwConfigured: acknowledgementSw.configured,
    acknowledgementEnConfigured: acknowledgementEn.configured,
    reminderSwConfigured: reminderSw.configured,
    reminderEnConfigured: reminderEn.configured,
  };
}
