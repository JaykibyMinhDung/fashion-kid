import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-error';

export function addressValidationError(): ApiException {
  return new ApiException(
    HttpStatus.BAD_REQUEST,
    'VALIDATION_ERROR',
    'Dữ liệu địa chỉ không hợp lệ',
  );
}

export function addressNotFoundError(): ApiException {
  return new ApiException(
    HttpStatus.NOT_FOUND,
    'NOT_FOUND',
    'Không tìm thấy địa chỉ',
  );
}

export function cannotUnsetDefaultAddressError(): ApiException {
  return new ApiException(
    HttpStatus.CONFLICT,
    'HTTP_ERROR',
    'Hãy chọn một địa chỉ mặc định khác trước',
  );
}
