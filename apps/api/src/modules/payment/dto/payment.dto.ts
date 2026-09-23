import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '../../../generated/prisma/client';

export class CreateVnpayUrlResponseDto {
  @ApiProperty({ format: 'uuid', description: 'ID của Payment record' })
  paymentId!: string;

  @ApiProperty({ format: 'uuid', description: 'ID của Order liên kết' })
  orderId!: string;

  @ApiProperty({ description: 'URL thanh toán VNPay đã được ký số' })
  paymentUrl!: string;

  @ApiProperty({ description: 'Mã tham chiếu lần thanh toán duy nhất' })
  txnRef!: string;

  @ApiPropertyOptional({ description: 'Thời điểm hết hạn của link thanh toán' })
  expiresAt?: string;

  @ApiProperty({
    example: 'REDIRECT_TO_PAYMENT',
    description: 'Chỉ thị hành động tiếp theo cho client',
  })
  nextAction = 'REDIRECT_TO_PAYMENT' as const;
}

export class PaymentAttemptSummaryDto {
  @ApiProperty()
  attemptRef!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: string;
}

export class PaymentDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiPropertyOptional()
  orderNumber?: string;

  @ApiProperty({ enum: PaymentMethod })
  method!: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty({ description: 'Số tiền thanh toán dạng chuỗi số' })
  amount!: string;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiPropertyOptional()
  provider?: string | null;

  @ApiPropertyOptional()
  paidAt?: string | null;

  @ApiPropertyOptional()
  failedAt?: string | null;

  @ApiProperty({ description: 'Cho phép khách hàng bấm thanh toán lại' })
  canRetry!: boolean;

  @ApiPropertyOptional({ type: PaymentAttemptSummaryDto })
  latestAttempt?: PaymentAttemptSummaryDto | null;
}

export class VnPayReturnResponseDto {
  @ApiProperty({ description: 'Chữ ký checksum từ VNPay có hợp lệ không' })
  isValid!: boolean;

  @ApiProperty({ description: 'Giao dịch thanh toán thành công hay không' })
  isSuccess!: boolean;

  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty()
  orderNumber!: string;

  @ApiProperty({ format: 'uuid' })
  paymentId!: string;

  @ApiProperty({ description: 'Số tiền thanh toán dạng chuỗi số' })
  amount!: string;

  @ApiPropertyOptional({ description: 'Mã phản hồi từ VNPay' })
  responseCode?: string;

  @ApiProperty({ description: 'Thông báo kết quả giao dịch bằng tiếng Việt' })
  responseMessage!: string;

  @ApiProperty({
    enum: PaymentStatus,
    description: 'Trạng thái hiện tại của Payment trong database',
  })
  paymentStatus!: PaymentStatus;
}

export class VnPayIpnResponseDto {
  @ApiProperty({
    example: '00',
    description: 'Mã phản hồi theo chuẩn VNPay IPN',
  })
  RspCode!: string;

  @ApiProperty({
    example: 'Confirm Success',
    description: 'Thông điệp phản hồi',
  })
  Message!: string;
}
