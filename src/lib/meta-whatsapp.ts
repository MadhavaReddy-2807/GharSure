import { getEnv } from "./env";

export interface SendWhatsAppOtpOptions {
  toPhoneE164: string;
  otp: string;
}

export interface SendWhatsAppOtpResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string | number;
  isMock?: boolean;
}

/**
 * Deliver an OTP to an Indian mobile number via Meta WhatsApp Business Cloud API.
 * Uses the official Meta Authentication template schema.
 */
export async function sendWhatsAppOtp({
  toPhoneE164,
  otp,
}: SendWhatsAppOtpOptions): Promise<SendWhatsAppOtpResult> {
  const env = getEnv();

  // Strip '+' for Meta recipient format (Meta expects digits only, e.g., 919876543210)
  const recipientDigits = toPhoneE164.replace(/\D/g, "");

  // Development Mock Mode check
  if (env.OTP_DEV_MOCK_ENABLED) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n======================================================`);
      console.log(`[GHARSURE DEV MOCK] WhatsApp OTP to: ${toPhoneE164}`);
      console.log(`[GHARSURE DEV MOCK] OTP Code:        ${otp}`);
      console.log(`[GHARSURE DEV MOCK] Template:        ${env.META_WHATSAPP_OTP_TEMPLATE_NAME}`);
      console.log(`======================================================\n`);
    }

    // Simulate real network trip
    await new Promise((res) => setTimeout(res, 200));

    return {
      success: true,
      messageId: `wamid.mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      isMock: true,
    };
  }

  // Real Meta WhatsApp Cloud API call
  const url = `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}/${env.META_WHATSAPP_PHONE_NUMBER_ID}/messages`;

  // Support both Direct Send interactive authentication (no pre-approved template needed)
  // and Pre-Approved Authentication Templates.
  const isDirectSend = env.META_WHATSAPP_OTP_TEMPLATE_NAME.toLowerCase() === "direct";

  const requestBody = isDirectSend
    ? {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientDigits,
        type: "interactive",
        category: "authentication",
        interactive: {
          type: "button",
          body: {
            text: `${otp} is your GharSure verification code. For your security, do not share this code.`,
          },
          action: {
            buttons: [
              {
                type: "otp",
                otp: {
                  code: otp,
                  otp_type: "copy_code",
                  text: "Copy Code",
                },
              },
            ],
          },
        },
      }
    : {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientDigits,
        type: "template",
        template: {
          name: env.META_WHATSAPP_OTP_TEMPLATE_NAME,
          language: {
            code: env.META_WHATSAPP_OTP_TEMPLATE_LANGUAGE,
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: otp,
                },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                {
                  type: "text",
                  text: otp,
                },
              ],
            },
          ],
        },
      };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const err = data?.error;
      const errorMessage = err?.message || "Meta WhatsApp API delivery failed.";
      const errorCode = err?.code || response.status;

      console.error("[WhatsApp Cloud API Error]", {
        status: response.status,
        code: errorCode,
        type: err?.type,
        // Never log OTP or auth tokens
      });

      // Distinguish common Meta Cloud API errors
      if (errorCode === 131048) {
        return {
          success: false,
          error: "Daily WhatsApp messaging volume limit reached for your account tier. Please verify business in Meta Business Manager to increase limits.",
          errorCode: "MESSAGING_LIMIT_REACHED",
        };
      }

      if (errorCode === 131056) {
        return {
          success: false,
          error: "Recipient has reached WhatsApp's frequency limit for automated messages. Please try again in a few minutes.",
          errorCode: "RECIPIENT_FREQUENCY_LIMIT",
        };
      }

      if (response.status === 429 || errorCode === 130429 || errorCode === 80007) {
        return {
          success: false,
          error: "WhatsApp delivery rate limit exceeded. Please try again shortly.",
          errorCode: "RATE_LIMITED",
        };
      }

      if (errorCode === 131026 || errorCode === 131030) {
        return {
          success: false,
          error: "Unable to deliver WhatsApp message to this mobile number.",
          errorCode: "INVALID_RECIPIENT",
        };
      }

      return {
        success: false,
        error: "Failed to deliver verification code via WhatsApp. Please try again.",
        errorCode,
      };
    }

    const messageId = data?.messages?.[0]?.id;
    return {
      success: true,
      messageId,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === "AbortError") {
      return {
        success: false,
        error: "WhatsApp delivery request timed out. Please retry.",
        errorCode: "TIMEOUT",
      };
    }

    console.error("[WhatsApp Cloud API Network Exception]", err instanceof Error ? err.message : "Unknown error");
    return {
      success: false,
      error: "WhatsApp service temporarily unreachable. Please check your connection.",
      errorCode: "NETWORK_ERROR",
    };
  }
}
