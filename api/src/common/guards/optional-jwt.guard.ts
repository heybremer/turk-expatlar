import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(err: Error | null, user: T): T {
    return user;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context) as Promise<boolean>;
  }
}
