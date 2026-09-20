"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  loading?: boolean;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateRangeFilter({
  from,
  to,
  onChange,
  loading = false,
}: DateRangeFilterProps) {
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  const applyPreset = (days: number) => {
    const now = new Date();
    // tomorrow for half-open interval [from, to)
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
    const startDate = new Date(now.getTime() - (days - 1) * 24 * 3600 * 1000);
    const fStr = formatDate(startDate);
    const tStr = formatDate(tomorrow);
    setLocalFrom(fStr);
    setLocalTo(tStr);
    onChange({ from: fStr, to: tStr });
  };

  const applyThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
    const fStr = formatDate(firstDay);
    const tStr = formatDate(tomorrow);
    setLocalFrom(fStr);
    setLocalTo(tStr);
    onChange({ from: fStr, to: tStr });
  };

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (localFrom && localTo && localFrom < localTo) {
      onChange({ from: localFrom, to: localTo });
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-muted mr-1">Khoảng thời gian:</span>
        <button
          type="button"
          onClick={() => applyPreset(7)}
          className="rounded-xl bg-muted/20 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors"
        >
          7 ngày qua
        </button>
        <button
          type="button"
          onClick={() => applyPreset(30)}
          className="rounded-xl bg-muted/20 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors"
        >
          30 ngày qua
        </button>
        <button
          type="button"
          onClick={applyThisMonth}
          className="rounded-xl bg-muted/20 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors"
        >
          Tháng này
        </button>
      </div>

      {/* Date Pickers Form */}
      <form
        onSubmit={handleCustomApply}
        className="flex flex-wrap items-center gap-2"
      >
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={localFrom}
            onChange={(e) => setLocalFrom(e.target.value)}
            className="h-8 text-xs py-1 px-2 w-32"
          />
          <span className="text-xs text-muted">đến</span>
          <Input
            type="date"
            value={localTo}
            onChange={(e) => setLocalTo(e.target.value)}
            className="h-8 text-xs py-1 px-2 w-32"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !localFrom || !localTo || localFrom >= localTo}
          className="h-8 text-xs px-3"
        >
          <RefreshCw
            className={`size-3.5 mr-1 ${loading ? "animate-spin" : ""}`}
          />
          Lọc
        </Button>
      </form>
    </div>
  );
}
