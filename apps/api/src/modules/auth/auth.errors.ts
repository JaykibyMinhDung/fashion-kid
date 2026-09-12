import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-error';

export function invalidCredentialsError(): ApiException {
  return new ApiException(
    HttpStatus.UNAUTHORIZED,
    'INVALID_CREDENTIALS',
    'Email hoặc mật khẩu không hợp lệ',
  );
}

export function invalidSessionError(): ApiException {
  return new ApiException(
    HttpStatus.UNAUTHORIZED,
    'INVALID_SESSION',
    'Phiên đăng nhập không hợp lệ hoặc đã hết hạn',
  );
}

export function registrationFailedError(): ApiException {
  return new ApiException(
    HttpStatus.CONFLICT,
    'REGISTRATION_FAILED',
    'Không thể tạo tài khoản',
  );
}

export function passwordPolicyError(): ApiException {
  return new ApiException(
    HttpStatus.BAD_REQUEST,
    'VALIDATION_ERROR',
    'Mật khẩu không đáp ứng chính sách bảo mật',
  );
}
