import { CheckCircle2, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function RoutePlaceholder({
  eyebrow,
  title,
  description,
  checklist,
  documentStatus = "Đã dựng route",
}: {
  eyebrow: string;
  title: string;
  description: string;
  checklist: string[];
  documentStatus?: string;
}) {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardContent>
            <h2 className="text-lg font-bold">Phạm vi giao diện cơ bản</h2>
            <ul className="mt-5 space-y-4">
              {checklist.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-muted">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-sage" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="bg-surface-soft shadow-none">
          <CardContent>
            <Clock3 className="size-6 text-brand-strong" />
            <h2 className="mt-4 font-bold">Trạng thái triển khai</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Route và layout đã sẵn sàng. Nghiệp vụ chỉ được mở rộng sau khi tài liệu của day tương ứng được freeze.
            </p>
            <Badge className="mt-5">{documentStatus}</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
