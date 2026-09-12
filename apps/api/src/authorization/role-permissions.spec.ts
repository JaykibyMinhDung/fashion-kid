import { PERMISSIONS } from './permission';
import { ROLE_PERMISSIONS, roleHasPermissions } from './role-permissions';

describe('role permission map', () => {
  it('gives Admin every defined capability', () => {
    expect(ROLE_PERMISSIONS.ADMIN).toEqual(PERMISSIONS);
  });

  it('keeps Sales and Warehouse operational capabilities separated', () => {
    expect(roleHasPermissions('SALES_STAFF', ['ORDER_CONFIRM'])).toBe(true);
    expect(roleHasPermissions('SALES_STAFF', ['ORDER_SHIP'])).toBe(false);
    expect(roleHasPermissions('WAREHOUSE_STAFF', ['ORDER_SHIP'])).toBe(true);
    expect(roleHasPermissions('WAREHOUSE_STAFF', ['ORDER_CONFIRM'])).toBe(
      false,
    );
  });

  it('does not grant management or reporting permissions to Customer', () => {
    expect(roleHasPermissions('CUSTOMER', ['ORDER_READ_OWN'])).toBe(true);
    expect(roleHasPermissions('CUSTOMER', ['USER_MANAGE_ROLE'])).toBe(false);
    expect(roleHasPermissions('CUSTOMER', ['REPORT_READ'])).toBe(false);
  });

  it('defaults an empty requirement to deny', () => {
    expect(roleHasPermissions('ADMIN', [])).toBe(false);
  });
});
