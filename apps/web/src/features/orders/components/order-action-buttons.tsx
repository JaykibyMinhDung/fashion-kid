'use client';

import {
  AlertCircle,
  Box,
  CheckCircle2,
  CheckCheck,
  LoaderCircle,
  PackageCheck,
  Truck,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ApiClientError } from '@/lib/api/api-client';
import { orderActionErrorMessage } from '@/lib/api/error-ux';
import { useAuth } from '@/features/auth/session/auth-provider';
import {
  cancelMyOrder,
  cancelOrderByStaff,
  completeOrder,
  confirmOrder,
  deliverOrder,
  shipOrder,
  startPackingOrder,
} from '../api/order-client';
import type { AllowedAction, OrderDetail } from '../contracts';

const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do huỷ đơn hàng')
    .max(500, 'Lý do huỷ đơn hàng không được vượt quá 500 ký tự.'),
});
type CancelOrderFormValues = z.infer<typeof cancelOrderSchema>;

export function OrderActionButtons({
  order,
  onSuccess,
  onConflict,
  isCustomer = false,
}: {
  order: OrderDetail;
  onSuccess: (updated: OrderDetail) => void;
  onConflict: () => void;
  isCustomer?: boolean;
}) {
  const { authorizedRequest } = useAuth();
  const [loadingAction, setLoadingAction] = useState<AllowedAction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const cancelForm = useForm<CancelOrderFormValues>({
    resolver: zodResolver(cancelOrderSchema),
    defaultValues: { reason: '' },
  });
  const cancelReason = useWatch({
    control: cancelForm.control,
    name: 'reason',
    defaultValue: '',
  });

  const actions = order.allowedActions || [];

  if (actions.length === 0) {
    return null;
  }

  async function handleAction(action: AllowedAction) {
    setErrorMessage(null);
    setLoadingAction(action);

    try {
      let updated: OrderDetail;

      switch (action) {
        case 'CONFIRM':
          updated = await confirmOrder(authorizedRequest, order.id);
          break;
        case 'START_PACKING':
          updated = await startPackingOrder(authorizedRequest, order.id);
          break;
        case 'SHIP':
          updated = await shipOrder(authorizedRequest, order.id);
          break;
        case 'DELIVER':
          updated = await deliverOrder(authorizedRequest, order.id);
          break;
        case 'COMPLETE':
          updated = await completeOrder(authorizedRequest, order.id);
          break;
        default:
          return;
      }

      onSuccess(updated);
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 409) {
        setErrorMessage(orderActionErrorMessage(err));
        if (err.code !== 'PAID_ORDER_CANNOT_CANCEL') {
          onConflict();
        }
      } else if (err instanceof ApiClientError) {
        setErrorMessage(orderActionErrorMessage(err));
      } else {
        setErrorMessage('Đã xảy ra lỗi khi thực hiện thao tác.');
      }
    } finally {
      setLoadingAction(null);
    }
  }

  const handleConfirmCancel = cancelForm.handleSubmit(async ({ reason }) => {
    setErrorMessage(null);
    setLoadingAction('CANCEL');

    try {
      const updated = isCustomer
        ? await cancelMyOrder(authorizedRequest, order.id, reason)
        : await cancelOrderByStaff(authorizedRequest, order.id, reason);

      setShowCancelModal(false);
      cancelForm.reset();
      onSuccess(updated);
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 409) {
        setErrorMessage(orderActionErrorMessage(err));
        if (err.code !== 'PAID_ORDER_CANNOT_CANCEL') {
          onConflict();
        }
      } else if (err instanceof ApiClientError) {
        setErrorMessage(orderActionErrorMessage(err));
      } else {
        setErrorMessage('Đã xảy ra lỗi khi huỷ đơn hàng.');
      }
    } finally {
      setLoadingAction(null);
    }
  });

  return (
    <div className="space-y-3">
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {actions.includes('CONFIRM') && (
          <Button
            size="sm"
            onClick={() => handleAction('CONFIRM')}
            disabled={loadingAction !== null}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loadingAction === 'CONFIRM' ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
            )}
            Xác nhận đơn
          </Button>
        )}

        {actions.includes('START_PACKING') && (
          <Button
            size="sm"
            onClick={() => handleAction('START_PACKING')}
            disabled={loadingAction !== null}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loadingAction === 'START_PACKING' ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Box className="h-4 w-4 mr-1.5" />
            )}
            Bắt đầu đóng gói
          </Button>
        )}

        {actions.includes('SHIP') && (
          <Button
            size="sm"
            onClick={() => handleAction('SHIP')}
            disabled={loadingAction !== null}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loadingAction === 'SHIP' ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Truck className="h-4 w-4 mr-1.5" />
            )}
            Xuất kho giao hàng
          </Button>
        )}

        {actions.includes('DELIVER') && (
          <Button
            size="sm"
            onClick={() => handleAction('DELIVER')}
            disabled={loadingAction !== null}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {loadingAction === 'DELIVER' ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <PackageCheck className="h-4 w-4 mr-1.5" />
            )}
            Xác nhận đã giao
          </Button>
        )}

        {actions.includes('COMPLETE') && (
          <Button
            size="sm"
            onClick={() => handleAction('COMPLETE')}
            disabled={loadingAction !== null}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loadingAction === 'COMPLETE' ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4 mr-1.5" />
            )}
            Hoàn tất & Quyết toán COD
          </Button>
        )}

        {actions.includes('CANCEL') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setErrorMessage(null);
              cancelForm.reset();
              setShowCancelModal(true);
            }}
            disabled={loadingAction !== null}
            className="border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Huỷ đơn hàng
          </Button>
        )}
      </div>

      {/* Cancel confirmation dialog */}
      <ConfirmDialog
        open={showCancelModal}
        title={`Xác nhận hủy đơn hàng ${order.orderNumber}`}
        description="Hành động này sẽ giải phóng tồn kho đã giữ và hủy giao dịch thanh toán. Vui lòng nhập lý do cụ thể."
        confirmLabel="Xác nhận hủy"
        cancelLabel="Đóng"
        variant="danger"
        loading={loadingAction === 'CANCEL' || cancelForm.formState.isSubmitting}
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setShowCancelModal(false);
          cancelForm.reset();
          setErrorMessage(null);
        }}
      >
        <label
          htmlFor="cancel-reason"
          className="block text-xs font-semibold text-foreground mb-1.5"
        >
          Lý do hủy đơn <span className="text-rose-600">*</span>
        </label>
        <textarea
          id="cancel-reason"
          rows={3}
          maxLength={500}
          {...cancelForm.register('reason')}
          aria-invalid={cancelForm.formState.errors.reason ? true : undefined}
          placeholder="Nhập lý do hủy đơn hàng (tối đa 500 ký tự)..."
          disabled={loadingAction === 'CANCEL' || cancelForm.formState.isSubmitting}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-hidden focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
        />
        <div className="mt-1 text-right text-[11px] text-muted">
          {cancelReason.length}/500 ký tự
        </div>
        {cancelForm.formState.errors.reason ? (
          <p role="alert" className="mt-1 text-xs text-rose-700">
            {cancelForm.formState.errors.reason.message}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
