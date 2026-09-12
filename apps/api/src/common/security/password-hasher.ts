import { Injectable } from '@nestjs/common';
import { hash, verify } from 'argon2';
import { ARGON2_OPTIONS } from './password-hashing.config';

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

@Injectable()
export class PasswordHasher {
  hash(password: string): Promise<string> {
    return hashPassword(password);
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verifyPassword(passwordHash, password);
  }
}
