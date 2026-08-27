import {
  getFinancialWhatsAppTemplate,
  type FinancialWhatsAppTemplateKind,
  type FinancialWhatsAppTemplateOverride,
} from "@/lib/financialWhatsAppConfig";
import { formatPassIdForDisplay } from "@/lib/passId";

type WhatsAppLanguageCode =
  | "sw"
  | "en_US";

type SendInvitationTemplateInput = {
  phoneNumber: string;
  templateName: string;
  languageCode: WhatsAppLanguageCode;

  guestName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  eventPassId: string;
  allowedGuests: number;

  invitationToken: string;
  locationUrl: string;
  cardImageUrl?: string;
};

type WhatsAppApiMessage = {
  id: string;
  message_status?: string;
};

type WhatsAppApiResponse = {
  messaging_product?: string;

  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;

  messages?: WhatsAppApiMessage[];

  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

function getMetaApiError(
  responseData: WhatsAppApiResponse
) {
  const error =
    responseData.error;

  if (!error) {
    return "WhatsApp message haikuweza kutumwa.";
  }

  const metadata = [
    error.code
      ? `code ${error.code}`
      : "",
    error.error_subcode
      ? `subcode ${error.error_subcode}`
      : "",
    error.fbtrace_id
      ? `trace ${error.fbtrace_id}`
      : "",
  ].filter(Boolean);

  return [
    error.message ||
      "WhatsApp message haikuweza kutumwa.",
    metadata.length > 0
      ? `(${metadata.join(", ")})`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

type TemplateTextParameter = {
  type: "text";
  text: string;
};

type TemplateImageParameter = {
  type: "image";

  image: {
    link: string;
  };
};

type TemplatePayloadParameter = {
  type: "payload";
  payload: "accepted" | "declined";
};

type TemplateComponent =
  | {
      type: "header";
      parameters: TemplateImageParameter[];
    }
  | {
      type: "body";
      parameters: TemplateTextParameter[];
    }
  | {
      type: "button";
      sub_type: "quick_reply";
      index: "0" | "1";
      parameters: TemplatePayloadParameter[];
    }
  | {
      type: "button";
      sub_type: "url";
      index: "2" | "3";
      parameters: TemplateTextParameter[];
    };

function getRequiredEnvironmentVariable(
  variableName: string
) {
  const value =
    process.env[variableName]?.trim();

  if (!value) {
    throw new Error(
      `${variableName} haijawekwa kwenye environment variables.`
    );
  }

  return value;
}

export function normalizeWhatsAppPhoneNumber(
  phoneNumber: string
) {
  let cleanedPhone =
    phoneNumber.replace(/\D/g, "");

  if (
    cleanedPhone.startsWith("0")
  ) {
    cleanedPhone =
      `255${cleanedPhone.slice(1)}`;
  }

  if (
    cleanedPhone.startsWith("2550")
  ) {
    cleanedPhone =
      `255${cleanedPhone.slice(4)}`;
  }

  if (
    cleanedPhone.length < 10
  ) {
    throw new Error(
      "Namba ya WhatsApp si sahihi."
    );
  }

  return cleanedPhone;
}

export async function sendWhatsAppInvitationTemplate({
  phoneNumber,
  templateName,
  languageCode,

  guestName,
  eventTitle,
  eventDate,
  eventTime,
  venue,
  eventPassId,
  allowedGuests,

  invitationToken,
  locationUrl,
  cardImageUrl,
}: SendInvitationTemplateInput) {
  const accessToken =
    getRequiredEnvironmentVariable(
      "WHATSAPP_ACCESS_TOKEN"
    );

  const phoneNumberId =
    getRequiredEnvironmentVariable(
      "WHATSAPP_PHONE_NUMBER_ID"
    );

  const graphApiVersion =
    process.env
      .WHATSAPP_GRAPH_API_VERSION
      ?.trim() || "v23.0";

  const recipientPhone =
    normalizeWhatsAppPhoneNumber(
      phoneNumber
    );

  const components:
    TemplateComponent[] = [];

  if (cardImageUrl) {
    components.push({
      type: "header",

      parameters: [
        {
          type: "image",

          image: {
            link: cardImageUrl,
          },
        },
      ],
    });
  }

  components.push({
    type: "body",

    parameters: [
      {
        type: "text",
        text: guestName,
      },
      {
        type: "text",
        text: eventTitle,
      },
      {
        type: "text",
        text: eventDate || "-",
      },
      {
        type: "text",
        text: eventTime || "-",
      },
      {
        type: "text",
        text: venue || "-",
      },
      {
        type: "text",
        text: eventPassId
          ? formatPassIdForDisplay(eventPassId)
          : "-",
      },
      {
        type: "text",
        text: String(
          allowedGuests
        ),
      },
    ],
  });

  components.push({
    type: "button",
    sub_type: "quick_reply",
    index: "0",
    parameters: [
      {
        type: "payload",
        payload: "accepted",
      },
    ],
  });

  components.push({
    type: "button",
    sub_type: "quick_reply",
    index: "1",
    parameters: [
      {
        type: "payload",
        payload: "declined",
      },
    ],
  });

  /*
   * The approved template's button 3 (index "2", "Fungua Mwaliko") has a
   * fixed base URL of https://www.smarteventpass.co.tz/invite/{{1}} -
   * invitationToken fills that dynamic suffix. Button 4 (index "3",
   * directions) is a fully dynamic URL button where {{1}} is the entire
   * link, so it takes locationUrl. These were previously swapped, which
   * sent guests to https://www.smarteventpass.co.tz/invite/<locationUrl>
   * (a 404) when they tapped "Fungua Mwaliko".
   */
  components.push({
    type: "button",
    sub_type: "url",
    index: "2",
    parameters: [
      {
        type: "text",
        text: invitationToken,
      },
    ],
  });

  components.push({
    type: "button",
    sub_type: "url",
    index: "3",

    parameters: [
      {
        type: "text",
        text: locationUrl,
      },
    ],
  });

  const requestBody = {
    messaging_product:
      "whatsapp",

    recipient_type:
      "individual",

    to: recipientPhone,

    type: "template",

    template: {
      name: templateName,

      language: {
        code: languageCode,
      },

      components,
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${accessToken}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(
        requestBody
      ),

      cache: "no-store",
    }
  );

  const responseData =
    (await response.json()) as
      WhatsAppApiResponse;

  if (
    !response.ok ||
    responseData.error
  ) {
    const apiMessage =
      getMetaApiError(
        responseData
      );

    throw new Error(
      `WhatsApp Cloud API: ${apiMessage}`
    );
  }

  const messageId =
    responseData.messages?.[0]
      ?.id;

  const acceptanceStatus =
    responseData.messages?.[0]
      ?.message_status ||
    "accepted";

  if (!messageId) {
    throw new Error(
      "WhatsApp Cloud API haikurudisha message ID."
    );
  }

  console.info(
    "WhatsApp Cloud API accepted message:",
    {
      messageId,
      acceptanceStatus,
      hasMatchedContact:
        Boolean(
          responseData.contacts?.[0]
            ?.wa_id
        ),
    }
  );

  return {
    success: true,
    messageId,
    recipientPhone,
    acceptanceStatus,
  };
}

export type FinancialWhatsAppTemplateInput = {
  phoneNumber: string;
  language: "sw" | "en";
  templateKind: FinancialWhatsAppTemplateKind;
  parameters: string[];
  urlButtonSuffix?: string;
  templateOverride?: FinancialWhatsAppTemplateOverride;
};

export async function sendFinancialWhatsAppTemplate(input: FinancialWhatsAppTemplateInput) {
  const accessToken = getRequiredEnvironmentVariable("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = getRequiredEnvironmentVariable("WHATSAPP_PHONE_NUMBER_ID");
  const template = getFinancialWhatsAppTemplate(input.templateKind, input.language, input.templateOverride);
  if (!template.templateName) {
    const languageLabel = input.language === "sw" ? "Swahili" : "English";
    throw new Error(`The approved ${languageLabel} WhatsApp ${input.templateKind.replaceAll("_", " ")} template is not configured.`);
  }
  if(input.templateKind==="meeting_invitation"&&input.parameters.length!==6){
    throw new Error("The meeting invitation template payload is incomplete.");
  }
  if(input.templateKind==="reminder"&&input.parameters.length!==5){
    throw new Error("The pledge reminder template payload is incomplete.");
  }
  const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v23.0";
  const recipientPhone = normalizeWhatsAppPhoneNumber(input.phoneNumber);
  const response = await fetch(`https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhone,
      type: "template",
      template: {
        name: template.templateName,
        language: { code: template.languageCode },
        components: [{
          type: "body",
          parameters: input.parameters.map((parameter) => ({ type: "text", text: parameter })),
        }, ...(input.urlButtonSuffix ? [{
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: input.urlButtonSuffix }],
        }] : [])],
      },
    }),
    cache: "no-store",
  });
  const responseData = await response.json() as WhatsAppApiResponse;
  if (!response.ok || responseData.error) {
    throw new Error(
      `WhatsApp Cloud API (HTTP ${response.status}): ${getMetaApiError(responseData)}`
    );
  }
  const messageId = responseData.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp Cloud API did not return a message ID.");
  return { success: true as const, messageId, recipientPhone, acceptanceStatus: responseData.messages?.[0]?.message_status || "accepted" };
}
