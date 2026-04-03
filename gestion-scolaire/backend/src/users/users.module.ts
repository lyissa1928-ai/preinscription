import { forwardRef, Module } from '@nestjs/common';
import { BadgeController } from './badge.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { DeviceTokenModule } from '../device-token/device-token.module';
import { AuditModule } from '../audit/audit.module';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [
    forwardRef(() => AttendanceModule),
    AuthModule,
    DeviceTokenModule,
    AuditModule,
  ],
  controllers: [UsersController, BadgeController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
