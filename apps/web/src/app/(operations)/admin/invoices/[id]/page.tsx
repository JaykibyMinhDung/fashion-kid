'use client';

import { LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiClientError } from '@/lib/api/api-client';
import { useAuth } from '@/features/auth/session/auth-provider';
import { getAdminInvoiceDetail } from '@/features/billing/api/billing-client';
import { InvoiceView } from '@/features/billing/components/invoice-view';
import type { InvoiceDetail } from '@/features/billing/contracts';

export default function AdminInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { authorizedRequest } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    getAdminInvoiceDetail(authorizedRequest, id)
      .then((data) => {
        if (active) {
          setInvoice(data);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'Không thể tải thông tin hoá đơn',
          );
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authorizedRequest, id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="py-12">
        <EmptyState
          title="Không tìm thấy hoá đơn"
          description={error || 'Hoá đơn không tồn tại trên hệ thống.'}
          action={
            <Link
              href="/admin/invoices"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            >
              Quay lại danh sách
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="py-6">
      <InvoiceView
        invoice={invoice}
        backHref="/admin/invoices"
        backLabel="Quay lại danh sách hoá đơn"
      />
    </div>
  );
}
