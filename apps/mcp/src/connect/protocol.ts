import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";

export class ConnectionFault extends Error {
  constructor(
    readonly code:
      | "INVALID_INPUT"
      | "CALLBACK_FAILED"
      | "TIMEOUT"
      | "CANCELLED"
      | "CREDENTIAL_STORE"
      | "CONFIGURATION_CONFLICT"
      | "EXCHANGE_REJECTED"
      | "EXCHANGE_UNKNOWN"
      | "INSTALLATION_FAILED",
    // fixed codes only; never attach raw HTTP/config/credential errors
  ) {
    super(`[specbridge-connect] ${code}`);
  }
}
export const nonce = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/)
  .refine(
    (value) => Buffer.from(value, "base64url").toString("base64url") === value,
  );
export const uuid = z.uuid().transform((value) => value.toLowerCase());
export const portSchema = z.number().int().min(1024).max(65535);
export function origin(raw: unknown): string {
  try {
    if (typeof raw !== "string") throw new Error();
    const url = new URL(raw);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      !(
        url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["127.0.0.1", "[::1]", "localhost"].includes(url.hostname))
      )
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new ConnectionFault("INVALID_INPUT");
  }
}
export function attempt() {
  const verifier = randomBytes(32).toString("base64url");
  return {
    grantId: randomUUID(),
    verifier,
    challenge: createHash("sha256")
      .update(verifier, "ascii")
      .digest("base64url"),
    state: randomBytes(32).toString("base64url"),
  };
}
export function sameNonce(a: string, b: string) {
  return (
    nonce.safeParse(a).success &&
    nonce.safeParse(b).success &&
    timingSafeEqual(Buffer.from(a, "ascii"), Buffer.from(b, "ascii"))
  );
}
export function callbackUrl(port: number) {
  const result = portSchema.safeParse(port);
  if (!result.success) throw new ConnectionFault("INVALID_INPUT");
  return `http://127.0.0.1:${result.data}/specbridge/callback`;
}
export function browserUrl(
  webOrigin: string,
  projectId: string,
  input: {
    grantId: string;
    verifier: string;
    challenge: string;
    state: string;
  },
  port: number,
) {
  const project = uuid.safeParse(projectId);
  if (
    !project.success ||
    !uuid.safeParse(input.grantId).success ||
    !nonce.safeParse(input.state).success ||
    !nonce.safeParse(input.challenge).success
  )
    throw new ConnectionFault("INVALID_INPUT");
  callbackUrl(port);
  const url = new URL(
    `/app/projects/${project.data}/agent-connect`,
    origin(webOrigin),
  );
  // The verifier and project Token never enter the browser or its URL.
  url.hash = new URLSearchParams({
    grantId: input.grantId,
    challenge: input.challenge,
    challengeMethod: "S256",
    state: input.state,
    callbackPort: String(port),
  }).toString();
  return url.href;
}
export const callbackInput = z.strictObject({
  grantId: uuid,
  code: z
    .string()
    .regex(/^sbc_[A-Za-z0-9_-]{43}$/)
    .refine((value) => nonce.safeParse(value.slice(4)).success),
  state: nonce,
});
