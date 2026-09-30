import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorState({
  title = 'Đã xảy ra lỗi',
  message = 'Không thể tải dữ liệu. Vui lòng thử lại.',
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-8 text-center ${className ?? ''}`}
    >
      <AlertTriangle className="h-8 w-8 text-rose-500" />
      <h3 className="text-sm font-bold text-rose-900">{title}</h3>
      <p className="max-w-sm text-xs text-rose-700">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2 border-rose-300 text-rose-700 hover:bg-rose-100"
        >
          Thử lại
        </Button>
      )}
    </div>
  );
}
