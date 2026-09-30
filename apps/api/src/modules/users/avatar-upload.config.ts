import { existsSync, mkdirSync } from 'fs';
import { extname } from 'path';
import { diskStorage } from 'multer';
import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-error';

const AVATARS_DIR = 'uploads/avatars';

if (!existsSync(AVATARS_DIR)) {
  mkdirSync(AVATARS_DIR, { recursive: true });
}

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export const avatarStorage = diskStorage({
  destination: AVATARS_DIR,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
  },
});

export function avatarFileFilter(
  _req: unknown,
  file: { mimetype: string },
  cb: (error: Error | null, accept: boolean) => void,
): void {
  if (ALLOWED_MIMES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Chỉ chấp nhận file ảnh (JPG, PNG, WEBP, GIF)',
      ),
      false,
    );
  }
}
