import { Clock, CheckCircle, XCircle } from 'lucide-react';
import {
  ORDER_STATUS_LABELS,
  type OrderStatusHistory,
} from '../contracts';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function OrderTimeline({
  histories,
}: {
  histories: OrderStatusHistory[];
}) {
  if (!histories || histories.length === 0) {
    return (
      <p className="text-sm text-muted">Chưa có lịch sử trạng thái.</p>
    );
  }

  return (
    <div className="relative pl-6 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-[2px] before:bg-border">
      <ul className="space-y-4">
        {histories.map((h, idx) => {
          const isCancel = h.toStatus === 'CANCELLED';
          const isComplete = h.toStatus === 'COMPLETED';

          return (
            <li key={h.id || idx} className="relative">
              <span
                className={`absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-surface ${
                  isCancel
                    ? 'bg-rose-500 text-white'
                    : isComplete
                      ? 'bg-emerald-500 text-white'
                      : 'bg-brand text-white'
                }`}
              >
                {isCancel ? (
                  <XCircle className="h-3.5 w-3.5" />
                ) : isComplete ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
              </span>

              <div className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {ORDER_STATUS_LABELS[h.toStatus] ?? h.toStatus}
                  </span>
                  <span className="text-xs text-muted">
                    {formatDate(h.createdAt)}
                  </span>
                </div>

                {h.actorName && (
                  <p className="mt-0.5 text-xs text-muted">
                    Bởi: <span className="font-medium text-foreground">{h.actorName}</span>
                  </p>
                )}

                {h.note && (
                  <p className="mt-1 rounded-lg bg-surface-soft p-2 text-xs italic text-muted-strong">
                    &ldquo;{h.note}&rdquo;
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
