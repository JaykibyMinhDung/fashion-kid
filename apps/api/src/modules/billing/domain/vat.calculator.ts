const BPS = 10_000n;

export interface VatExtractionResult {
  net: bigint;
  vat: bigint;
}

/**
 * Bóc tách thuế giá trị gia tăng (VAT) từ tổng tiền đã bao gồm thuế (tax-inclusive).
 * Áp dụng thuật toán làm tròn nửa lên (round half-up) với số nguyên lớn BigInt.
 *
 * Bất biến toán học: net + vat === gross với mọi gross >= 0n.
 *
 * @param gross Tổng số tiền đã bao gồm VAT (VND)
 * @param rateBps Thuế suất tính theo basis points (ví dụ: 800 = 8%, 1000 = 10%)
 */
export function extractVat(
  gross: bigint,
  rateBps: number,
): VatExtractionResult {
  if (gross <= 0n || rateBps <= 0) {
    return { net: gross, vat: 0n };
  }

  const r = BigInt(rateBps);
  const denom = BPS + r;
  const vat = (gross * r + denom / 2n) / denom;
  const net = gross - vat;

  return { net, vat };
}
