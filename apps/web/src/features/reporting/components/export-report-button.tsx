"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/session/auth-provider";
import { exportConsolidatedWorkbook } from "../api/reporting-client";

interface ExportReportButtonProps {
  dateRange: { from: string; to: string };
  granularity?: "day" | "week" | "month";
  className?: string;
}

export function ExportReportButton({
  dateRange,
  granularity = "day",
  className,
}: ExportReportButtonProps) {
  const { authorizedBlobRequest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleExport = async () => {
    if (!authorizedBlobRequest) {
      setError("Tính năng xuất dữ liệu chưa sẵn sàng trên phiên đăng nhập này");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const filename = await exportConsolidatedWorkbook(authorizedBlobRequest, {
        ...dateRange,
        granularity,
      });
      setSuccessMessage(`Đã xuất file thành công: ${filename}`);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Xuất báo cáo Excel thất bại";
      setError(msg);
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-flex flex-col items-end">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={loading}
        className={className}
        title="Tải toàn bộ báo cáo phân tích ra file Excel (.xlsx)"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin text-brand" />
            <span>Đang xuất Excel...</span>
          </>
        ) : (
          <>
            <FileSpreadsheet className="size-4 text-emerald-600" />
            <span>Xuất Excel</span>
            <Download className="size-3.5 text-muted" />
          </>
        )}
      </Button>

      {successMessage && (
        <div className="absolute top-full z-50 mt-1.5 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-md">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="absolute top-full z-50 mt-1.5 whitespace-nowrap rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 shadow-md">
          {error}
        </div>
      )}
    </div>
  );
}
