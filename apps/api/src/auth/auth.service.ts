import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthRepository } from './auth.repository.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { RateLimitService } from './rate-limit.service.js';
import type { LoginDto, RegisterDto } from './auth.dto.js';
import type { SafeUser } from './auth.types.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthRepository) private readonly repository: AuthRepository,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
  ) {}
  async register(input: RegisterDto) {
    const hash = await this.passwords.hash(input.password);
    const user = await this.repository.register(
      input.email,
      input.displayName,
      hash,
    );
    if (!user)
      throw new ConflictException({
        code: 'REGISTRATION_UNAVAILABLE',
        message: 'Registration is unavailable',
      });
    return user;
  }
  async login(input: LoginDto, ip: string, oldToken: unknown) {
    this.limits.loginIdentity(ip, input.email);
    const found = await this.repository.findCredentials(input.email);
    if (
      !(await this.passwords.verify(input.password, found?.passwordHash)) ||
      !found
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const session = await this.sessions.create(found.id, oldToken);
    const user: SafeUser = {
      id: found.id,
      email: found.email,
      displayName: found.displayName,
      createdAt: found.createdAt,
    };
    return { user, session };
  }
}
