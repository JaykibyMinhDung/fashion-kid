"use client";

import { CheckCircle2, Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ReviewFormModal } from "./review-form-modal";

export function OrderItemReviewButton({
  orderItemId,
  productName,
}: {
  orderItemId: string;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
        <CheckCircle2 className="size-3.5" />
        Đã gửi đánh giá
      </span>
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <Star className="size-3.5" aria-hidden="true" />
        Viết đánh giá
      </Button>

      {open ? (
        <ReviewFormModal
          mode="create"
          orderItemId={orderItemId}
          productName={productName}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            setDone(true);
          }}
        />
      ) : null}
    </>
  );
}
