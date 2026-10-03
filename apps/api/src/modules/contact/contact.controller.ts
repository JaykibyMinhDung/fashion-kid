import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Public } from '../../common/auth/public.decorator';
import { ContactService } from './contact.service';
import {
  ContactMessageDto,
  ContactSubmissionResponseDto,
} from './dto/contact-message.dto';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Public()
  // Form công khai: giới hạn 5 lần / 10 phút mỗi IP để chống spam
  @SkipThrottle({ default: false })
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gửi tin nhắn liên hệ tới bộ phận CSKH' })
  @ApiCreatedResponse({ type: ContactSubmissionResponseDto })
  submit(
    @Body() dto: ContactMessageDto,
  ): Promise<ContactSubmissionResponseDto> {
    return this.contactService.submit(dto);
  }
}
