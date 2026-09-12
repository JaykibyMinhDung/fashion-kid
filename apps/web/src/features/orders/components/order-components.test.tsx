import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OrderDetail, OrderStatus } from '../contracts';
import { OrderActionButtons } from './order-action-buttons';
import { OrderStatusBadge } from './order-status-badge';
import { OrderTimeline } from './order-timeline';

// Mock useAuth
vi.mock('@/features/auth/session/auth-provider', () => ({
  useAuth: () => ({
    authorizedRequest: vi.fn(),
  }),
}));

const MOCK_ORDER: OrderDetail = {
  id: 'order-1',
  orderNumber: 'ORD-20260908-000001',
  userId: 'user-1',
  status: 'PENDING',
  currency: 'VND',
  itemsSubtotal: '300000',
  discountAmount: '0',
  shippingFee: '30000',
  totalAmount: '330000',
  items: [],
  shipping: {
    receiverName: 'Nguyễn Văn A',
    receiverPhone: '0901234567',
    shippingAddressLine: '123 Lê Lợi',
    shippingWardCode: '00001',
    shippingWardName: 'Bến Nghé',
    shippingProvinceCode: '01',
    shippingProvinceName: 'Hà Nội',
    shippingFee: '30000',
  },
  statusHistories: [
    {
      id: 'h-1',
      fromStatus: null,
      toStatus: 'PENDING',
      actorName: 'Khách hàng',
      note: 'Khởi tạo đơn hàng',
      createdAt: '2026-09-08T10:00:00Z',
    },
  ],
  allowedActions: ['CONFIRM', 'CANCEL'],
  createdAt: '2026-09-08T10:00:00Z',
  updatedAt: '2026-09-08T10:00:00Z',
};

describe('Order Components', () => {
  describe('OrderStatusBadge', () => {
    const cases: [OrderStatus, string][] = [
      ['PENDING', 'Chờ xác nhận'],
      ['CONFIRMED', 'Đã xác nhận'],
      ['PACKING', 'Đang đóng gói'],
      ['SHIPPING', 'Đang giao hàng'],
      ['DELIVERED', 'Đã giao hàng'],
      ['COMPLETED', 'Hoàn tất'],
      ['CANCELLED', 'Đã huỷ'],
    ];

    it.each(cases)('renders label "%s" -> "%s"', (status, expectedText) => {
      render(<OrderStatusBadge status={status} />);
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
  });

  describe('OrderTimeline', () => {
    it('renders timeline items with status labels and notes', () => {
      render(<OrderTimeline histories={MOCK_ORDER.statusHistories} />);
      expect(screen.getByText('Chờ xác nhận')).toBeInTheDocument();
      expect(screen.getByText('Khách hàng')).toBeInTheDocument();
      expect(screen.getByText(/Khởi tạo đơn hàng/)).toBeInTheDocument();
    });

    it('renders empty message when histories is empty', () => {
      render(<OrderTimeline histories={[]} />);
      expect(screen.getByText('Chưa có lịch sử trạng thái.')).toBeInTheDocument();
    });
  });

  describe('OrderActionButtons', () => {
    it('renders buttons according to allowedActions array', () => {
      render(
        <OrderActionButtons
          order={MOCK_ORDER}
          onSuccess={vi.fn()}
          onConflict={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /Xác nhận đơn/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Huỷ đơn hàng/ })).toBeInTheDocument();
    });

    it('renders nothing when allowedActions is empty', () => {
      const { container } = render(
        <OrderActionButtons
          order={{ ...MOCK_ORDER, allowedActions: [] }}
          onSuccess={vi.fn()}
          onConflict={vi.fn()}
        />,
      );

      expect(container).toBeEmptyDOMElement();
    });
  });
});
