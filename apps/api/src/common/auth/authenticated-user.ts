import type { RoleCode } from '../../modules/auth/auth.types';

export interface AuthenticatedRequestUser {
  id: string;
  role: RoleCode;
}
