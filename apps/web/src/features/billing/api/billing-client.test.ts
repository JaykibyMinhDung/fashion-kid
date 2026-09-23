import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAdminInvoiceDetail,
  getAdminInvoices,
  getOrderInvoice,
} from './billing-client';

describe('Billing API Client', () => {
  const mockAuthorizedRequest = vi.fn();

  beforeEach(() => {
    mockAuthorizedRequest.mockReset();
  });

  describe('getOrderInvoice', () => {
    it('calls GET /api/v1/orders/:orderId/invoice', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({
        id: 'inv-123',
        invoiceNumber: 'INV-202609-000001',
      });

      const res = await getOrderInvoice(mockAuthorizedRequest, 'ord-xyz-123');

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/orders/ord-xyz-123/invoice',
      );
      expect(res.invoiceNumber).toBe('INV-202609-000001');
    });
  });

  describe('getAdminInvoices', () => {
    it('calls GET /api/v1/admin/invoices with query params', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({ items: [], total: 0 });

      await getAdminInvoices(mockAuthorizedRequest, {
        page: 1,
        limit: 20,
        status: 'ISSUED',
        orderNumber: 'ORD-2026',
      });

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/admin/invoices?page=1&limit=20&status=ISSUED&orderNumber=ORD-2026',
      );
    });

    it('calls GET /api/v1/admin/invoices without query string when empty', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({ items: [], total: 0 });

      await getAdminInvoices(mockAuthorizedRequest);

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/admin/invoices',
      );
    });
  });

  describe('getAdminInvoiceDetail', () => {
    it('calls GET /api/v1/admin/invoices/:id', async () => {
      mockAuthorizedRequest.mockResolvedValueOnce({
        id: 'inv-456',
        invoiceNumber: 'INV-202609-000002',
      });

      const res = await getAdminInvoiceDetail(mockAuthorizedRequest, 'inv-456');

      expect(mockAuthorizedRequest).toHaveBeenCalledWith(
        '/api/v1/admin/invoices/inv-456',
      );
      expect(res.id).toBe('inv-456');
    });
  });
});
