import { z } from "zod";
import { McpFault } from "./errors.js";

export class McpConfig {
  readonly origin: string;
  readonly projectId: string;
  #authorization: string;
  constructor(env: NodeJS.ProcessEnv) {
    try {
      const raw = env.SPECBRIDGE_API_TOKEN;
      if (
        !raw ||
        !/^sbp_[A-Za-z0-9_-]{43}$/.test(raw) ||
        Buffer.from(raw.slice(4), "base64url").toString("base64url") !==
          raw.slice(4)
      )
        throw new Error();
      const url = new URL(env.SPECBRIDGE_API_BASE_URL ?? "");
      const loopback = ["127.0.0.1", "[::1]", "localhost"].includes(
        url.hostname,
      );
      if (
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/" ||
        !(url.protocol === "https:" || (url.protocol === "http:" && loopback))
      )
        throw new Error();
      this.projectId = z.uuid().parse(env.SPECBRIDGE_PROJECT_ID).toLowerCase();
      this.origin = url.origin;
      this.#authorization = `Bearer ${raw}`;
    } catch {
      throw new McpFault("CONFIGURATION_ERROR");
    }
  }
  headers() {
    return { Authorization: this.#authorization, Accept: "application/json" };
  }
}
