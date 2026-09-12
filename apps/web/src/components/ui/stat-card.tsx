import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted">{label}</p>
            <p className="mt-2 text-3xl font-black tracking-[-0.04em]">{value}</p>
          </div>
          <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand-strong"><Icon className="size-5" /></span>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">{detail}</p>
      </CardContent>
    </Card>
  );
}
