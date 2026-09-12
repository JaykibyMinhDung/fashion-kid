import { argon2id } from 'argon2';
import type { HashOptions } from 'argon2';

export const ARGON2_OPTIONS: HashOptions & { raw?: false } = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};
