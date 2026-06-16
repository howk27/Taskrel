type SendGridError = {
  code?: number;
  message?: string;
  response?: {
    statusCode?: number;
    body?: {
      errors?: {
        message?: string;
        field?: string | null;
        help?: string | null;
      }[];
    };
  };
};

export function describeSendGridError(err: unknown) {
  const error = err as SendGridError;
  const statusCode = Number(error.response?.statusCode ?? error.code ?? 500);
  const providerMessage = error.response?.body?.errors?.[0]?.message ?? error.message ?? "SendGrid send failed";
  const lowerMessage = providerMessage.toLowerCase();

  if (statusCode === 401 && lowerMessage.includes("credits")) {
    return {
      code: "sendgrid_credits_exceeded",
      message: "SendGrid refused the email because the account has exceeded its available credits.",
      statusCode,
    };
  }

  if (statusCode === 401) {
    return {
      code: "sendgrid_key_rejected",
      message: "SendGrid rejected the API key. Check SENDGRID_API_KEY.",
      statusCode,
    };
  }

  if (statusCode === 403) {
    return {
      code: "sendgrid_sender_not_allowed",
      message: "SendGrid rejected the sender. Check that SENDGRID_FROM_EMAIL is verified for this SendGrid account.",
      statusCode,
    };
  }

  if (statusCode === 400) {
    return {
      code: "sendgrid_bad_request",
      message: `SendGrid rejected the email request: ${providerMessage}`,
      statusCode,
    };
  }

  if (statusCode === 429) {
    return {
      code: "sendgrid_rate_limited",
      message: "SendGrid rate limited the email request. Try again after checking account limits.",
      statusCode,
    };
  }

  return {
    code: "sendgrid_send_failed",
    message: "SendGrid could not send the email. Check SendGrid Activity and local server logs.",
    statusCode,
  };
}
