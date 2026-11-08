import { Injectable } from '@nestjs/common';
import type { CookieOptions } from 'express';

@Injectable()
export class AuthConfig {
  readonly production = process.env.NODE_ENV === 'production';
  readonly cookieName = this.production
    ? '__Host-specbridge_session'
    : 'specbridge_session';
  readonly cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: this.production,
    sameSite: 'lax',
    path: '/',
  };
  readonly trustedOrigins: Set<string>;
  readonly trustedProxies: string[];

  constructor() {
    const origins =
      process.env.AUTH_TRUSTED_ORIGINS ??
      (this.production ? '' : 'http://localhost:3000');
    try {
      const entries = origins.split(',').map((s) => s.trim());
      if (entries.some((s) => !s)) throw new Error();
      for (const origin of entries) {
        const url = new URL(origin);
        if (
          url.origin !== origin ||
          !['http:', 'https:'].includes(url.protocol) ||
          (this.production && url.protocol !== 'https:')
        )
          throw new Error();
      }
      this.trustedOrigins = new Set(entries);
    } catch {
      throw new Error(
        'AUTH_TRUSTED_ORIGINS must contain exact trusted HTTP(S) origins; production requires HTTPS',
      );
    }
    this.trustedProxies = (
      process.env.AUTH_TRUSTED_PROXIES ?? (this.production ? '' : 'loopback')
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (
      this.trustedProxies.some((s) =>
        ['true', '*', '0.0.0.0/0', '::/0'].includes(s),
      )
    ) {
      throw new Error(
        'AUTH_TRUSTED_PROXIES must explicitly identify trusted proxies',
      );
    }
  }
}
