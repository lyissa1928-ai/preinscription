import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { DeviceTokenService } from './device-token.service';

@Injectable()
export class DeviceTokenGuard implements CanActivate {
  constructor(private deviceToken: DeviceTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-device-token'] as string | undefined;
    if (!token?.trim()) {
      throw new ForbiddenException('X-DEVICE-TOKEN requis');
    }
    const valid = await this.deviceToken.validateToken(token);
    if (!valid) {
      throw new ForbiddenException('Token device invalide ou inactif');
    }
    return true;
  }
}
