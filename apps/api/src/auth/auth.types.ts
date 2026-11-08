import type { Request } from 'express';

export interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}
export interface AuthRequest extends Request {
  requestId: string;
  auth?: { user: SafeUser; sessionId: string };
}
