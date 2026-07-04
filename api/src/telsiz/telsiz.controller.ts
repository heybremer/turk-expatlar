import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TELSIZ_CHANNELS } from './telsiz.channels';

@ApiTags('telsiz')
@Controller('telsiz')
export class TelsizController {
  @Get('channels')
  getChannels() {
    return TELSIZ_CHANNELS;
  }
}
