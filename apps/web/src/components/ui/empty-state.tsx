import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-border bg-surface-soft px-6 py-12 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-white text-muted">
        <Inbox className="size-5" />
      </span>
      <h2 className="mt-4 font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
