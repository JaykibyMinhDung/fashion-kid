const VND_FORMATTER = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function MoneyText({
  value,
  className,
}: {
  value: number | string;
  className?: string;
}) {
  const numeric = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(numeric)) {
    return <span className={className}>--</span>;
  }

  return <span className={className}>{VND_FORMATTER.format(numeric)}</span>;
}
