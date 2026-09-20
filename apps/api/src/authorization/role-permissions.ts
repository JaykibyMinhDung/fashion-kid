import type { RoleCode } from '../modules/auth/auth.types';
import { PERMISSIONS, type Permission } from './permission';

const CUSTOMER_PERMISSIONS = [
  'PROFILE_READ_OWN',
  'PROFILE_UPDATE_OWN',
  'ADDRESS_READ_OWN',
  'ADDRESS_WRITE_OWN',
  'CART_READ_OWN',
  'CART_WRITE_OWN',
  'ORDER_CREATE',
  'ORDER_READ_OWN',
  'ORDER_CANCEL_OWN',
  'REVIEW_CREATE',
  'REVIEW_UPDATE_OWN',
  'WISHLIST_READ_OWN',
  'WISHLIST_WRITE_OWN',
] as const satisfies readonly Permission[];

const SALES_PERMISSIONS = [
  'PROFILE_READ_OWN',
  'PROFILE_UPDATE_OWN',
  'ORDER_READ_ALL',
  'ORDER_CONFIRM',
  'ORDER_CANCEL_ANY',
] as const satisfies readonly Permission[];

const WAREHOUSE_PERMISSIONS = [
  'PROFILE_READ_OWN',
  'PROFILE_UPDATE_OWN',
  'INVENTORY_READ',
  'INVENTORY_IMPORT',
  'INVENTORY_ADJUST',
  'ORDER_READ_ALL',
  'ORDER_PACK',
  'ORDER_SHIP',
] as const satisfies readonly Permission[];

export const ROLE_PERMISSIONS = {
  CUSTOMER: CUSTOMER_PERMISSIONS,
  SALES_STAFF: SALES_PERMISSIONS,
  WAREHOUSE_STAFF: WAREHOUSE_PERMISSIONS,
  ADMIN: PERMISSIONS,
} as const satisfies Record<RoleCode, readonly Permission[]>;

export function roleHasPermissions(
  role: RoleCode,
  required: readonly Permission[],
): boolean {
  const granted = new Set<Permission>(ROLE_PERMISSIONS[role]);
  return required.length > 0 && required.every((value) => granted.has(value));
}
