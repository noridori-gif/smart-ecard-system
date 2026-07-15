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
  cardImageUrl?: string;
};

type WhatsAppApiMessage = {
  id: string;
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
      sub_type: "url";
      index: "0";
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
        text: eventPassId || "-",
      },
      {
        type: "text",
        text: String(
          allowedGuests
        ),
      },
    ],
  });

  /*
   * Template yetu itakuwa na URL button:
   *
   * https://smart-ecard-system.vercel.app/invite/{{1}}
   *
   * invitationToken ndiyo itajaza {{1}}.
   */
  components.push({
    type: "button",
    sub_type: "url",
    index: "0",

    parameters: [
      {
        type: "text",
        text: invitationToken,
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
      responseData.error
        ?.message ||
      "WhatsApp message haikuweza kutumwa.";

    throw new Error(
      `WhatsApp Cloud API: ${apiMessage}`
    );
  }

  const messageId =
    responseData.messages?.[0]
      ?.id;

  if (!messageId) {
    throw new Error(
      "WhatsApp Cloud API haikurudisha message ID."
    );
  }

  return {
    success: true,
    messageId,
    recipientPhone,
  };
}