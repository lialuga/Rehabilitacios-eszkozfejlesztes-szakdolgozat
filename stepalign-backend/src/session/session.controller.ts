import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionService } from './session.service';

@Controller('session')
export class SessionController {
  constructor(private service: SessionService) {}

  @Post()
  upsert(@Body() body: CreateSessionDto) {
    return this.service.upsertSession(body);
  }

  @Get(':userId')
  getUserSessions(@Param('userId') userId: string) {
    return this.service.getSessions(userId);
  }

  @Delete(':userId/:clientId')
  @HttpCode(204)
  remove(@Param('userId') userId: string, @Param('clientId') clientId: string) {
    return this.service.deleteSession(userId, clientId);
  }
}
