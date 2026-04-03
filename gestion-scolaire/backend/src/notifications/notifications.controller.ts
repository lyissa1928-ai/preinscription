import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  findForUser(
    @CurrentUser() user: { sub: string },
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.service.findForUser(user.sub, unreadOnly === 'true');
  }

  @Get('count')
  countUnread(@CurrentUser() user: { sub: string }) {
    return this.service.countUnread(user.sub);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.markAsRead(id, user.sub);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: { sub: string }) {
    return this.service.markAllAsRead(user.sub);
  }
}
