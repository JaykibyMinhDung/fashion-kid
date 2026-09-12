import {
  ORDER_STATUS_CLASSES,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from '../contracts';

export function OrderStatusBadge({
  status,
  className = '',
}: {
  status: OrderStatus;
  className?: string;
}) {
  const label = ORDER_STATUS_LABELS[status] ?? status;
  const colorClass =
    ORDER_STATUS_CLASSES[status] ??
    'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
