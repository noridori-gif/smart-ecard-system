type BeemSmsRequest = {
  phoneNumber: string;
  message: string;
  maxAttempts?: number;
};

export type BeemSmsErrorDetails = {
  type:
    | "configuration"
    | "validation"
    | "provider"
    | "timeout"
    | "network"
    | "unexpected";
  message: string;
};

export type BeemSmsResult = {
  success: boolean;
  message: string;
  providerMessageId?: string;
  statusCode?: number;
  errorDetails?: BeemSmsErrorDetails;
};

type BeemPayload = {
  sender?: string;
  recipient?: string;
  message?: string;
  to?: string;
  text?: string;
};

type BeemApiResponse = {
  status?: string | number;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
  data?: {
    id?: string;
    messageId?: string;
    providerMessageId?: string;
    status?: string;
  };
};

function getBeemConfig() {
  const apiKey = process.env.BEEM_API_KEY?.trim();
  const secretKey = process.env.BEEM_SECRET_KEY?.trim();
  const senderName = process.env.BEEM_SENDER_NAME?.trim();

  if (!apiKey || !secretKey) {
    return {
      apiKey: null,
      secretKey: null,
      senderName,
      errorMessage: "BEEM API key or Secret key has not been configured yet.",
    };
  }

  if (!senderName) {
    return {
      apiKey,
      secretKey,
      senderName: null,
      errorMessage: "BEEM Sender Name has not been configured yet.",
    };
  }

  return {
    apiKey,
    secretKey,
    senderName,
    errorMessage: null,
  };
}

export function normalizeBeemPhoneNumber(
  phone: string | null | undefined
): string | null {
  if (!phone) {
    return null;
  }

  const cleaned = phone
    .trim()
    .replace(/[^\d+]/g, "");

  if (!cleaned) {
    return null;
  }

  const withoutPlus = cleaned.replace(/\+/g, "");
  const digitsOnly = withoutPlus.replace(/\s+/g, "");

  let normalized = digitsOnly;

  if (normalized.startsWith("0")) {
    normalized = `255${normalized.slice(1)}`;
  } else if (!normalized.startsWith("255") && /^7\d{8}$/.test(normalized)) {
    normalized = `255${normalized}`;
  }

  if (!/^255\d{9}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function buildErrorResult(
  message: string,
  type: BeemSmsErrorDetails["type"]
): BeemSmsResult {
  return {
    success: false,
    message,
    errorDetails: {
      type,
      message,
    },
  };
}

function parseResponseBody(
  responseText: string
): BeemApiResponse | null {
  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText) as BeemApiResponse;
  } catch {
    return null;
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function sendBeemSms({
  phoneNumber,
  message,
  maxAttempts = 3,
}: BeemSmsRequest): Promise<BeemSmsResult> {
  const normalizedPhone = normalizeBeemPhoneNumber(phoneNumber);

  if (!normalizedPhone) {
    return buildErrorResult(
      "Destination phone number is invalid.",
      "validation"
    );
  }

  const config = getBeemConfig();

  if (config.errorMessage) {
    return buildErrorResult(
      config.errorMessage,
      "configuration"
    );
  }

  const payload: BeemPayload = {
    sender: config.senderName || undefined,
    recipient: normalizedPhone,
    message: message.trim(),
  };

  const boundedAttempts = Math.min(Math.max(Math.trunc(maxAttempts), 1), 3);

  for (let attempt = 1; attempt <= boundedAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch(
        "https://apisms.beem.africa/v1/send",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.apiKey}:${config.secretKey}`).toString("base64")}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const responseText = await response.text();
      const responseBody = parseResponseBody(responseText);

      if (response.ok) {
        const providerMessageId = responseBody?.data?.id || responseBody?.data?.messageId || responseBody?.data?.providerMessageId;

        return {
          success: true,
          message: responseBody?.message || "SMS accepted by BEEM Africa.",
          providerMessageId,
          statusCode: response.status,
        };
      }

      const providerMessage = responseBody?.error?.message || responseBody?.message || "BEEM SMS request failed.";
      const statusCode = response.status;

      if (statusCode === 429 || statusCode >= 500) {
        if (attempt < boundedAttempts) {
          await sleep(600 * attempt);
          continue;
        }

        return {
          success: false,
          message: "BEEM SMS provider is temporarily unavailable. Please try again shortly.",
          statusCode,
          errorDetails: {
            type: "provider",
            message: providerMessage,
          },
        };
      }

      if (statusCode >= 400 && statusCode < 500) {
        return {
          success: false,
          message: "BEEM rejected the SMS request. Please verify the recipient phone number and sender name.",
          statusCode,
          errorDetails: {
            type: "provider",
            message: providerMessage,
          },
        };
      }

      return {
        success: false,
        message: "BEEM SMS provider returned an unexpected response.",
        statusCode,
        errorDetails: {
          type: "provider",
          message: providerMessage,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        if (attempt < boundedAttempts) {
          await sleep(600 * attempt);
          continue;
        }

        return buildErrorResult(
          "BEEM SMS request timed out.",
          "timeout"
        );
      }

      if (attempt < boundedAttempts) {
        await sleep(600 * attempt);
        continue;
      }

      return buildErrorResult(
        "Unable to reach the BEEM SMS provider.",
        "network"
      );
    }
  }

  return buildErrorResult(
    "BEEM SMS request could not be completed.",
    "unexpected"
  );
}
