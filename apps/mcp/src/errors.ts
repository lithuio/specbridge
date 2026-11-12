export const messages = {
  CONFIGURATION_ERROR:
    "MCP configuration is invalid. Check the three local SPECBRIDGE environment variables; do not paste credentials into chat.",
  INVALID_ARGUMENTS:
    "Tool arguments are invalid. Use the advertised schema; project and API origin cannot be overridden.",
  UNAUTHENTICATED:
    "Project credential is invalid, expired, revoked or no longer authorized. Ask the Owner to check it locally.",
  NOT_FOUND:
    "No approved specification is available for this credential and version.",
  RATE_LIMITED: "Read limit reached. Wait before making another request.",
  BUSY: "Too many concurrent reads. Wait for the current calls to finish.",
  TIMEOUT:
    "The authorized API did not respond within the time limit. No automatic retry was made.",
  CANCELLED: "The read was cancelled.",
  UNAVAILABLE:
    "The authorized API is unavailable. No automatic retry was made.",
  INVALID_RESPONSE:
    "The API response failed contract or project-scope validation.",
  RESPONSE_TOO_LARGE:
    "The API response exceeds the read budget. For a list, request fewer entries; for a detail, review it in SpecBridge.",
  REDIRECT_REFUSED:
    "The configured API redirected the request. Check the trusted API origin locally.",
} as const;
export class McpFault extends Error {
  constructor(
    public readonly code: keyof typeof messages,
    public readonly retryAfterSeconds?: number,
  ) {
    super(messages[code]);
  }
}
export function toolFailure(error: unknown) {
  const failure =
    error instanceof McpFault ? error : new McpFault("UNAVAILABLE");
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          error: {
            code: failure.code,
            message: failure.message,
            ...(failure.retryAfterSeconds
              ? { retryAfterSeconds: failure.retryAfterSeconds }
              : {}),
          },
        }),
      },
    ],
  };
}
