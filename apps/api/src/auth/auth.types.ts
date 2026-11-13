import type { Request } from 'express';
import type { ProjectTokenPrincipal } from '../api-tokens/token.contract.js';

export interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}
export interface AuthRequest extends Request {
  requestId: string;
  auth?: { user: SafeUser; sessionId: string };
  projectToken?: ProjectTokenPrincipal;
}
