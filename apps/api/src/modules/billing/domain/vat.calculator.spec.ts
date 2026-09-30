import { extractVat } from './vat.calculator';

describe('VatCalculator (extractVat)', () => {
  describe('Boundary and Zero conditions', () => {
    it('returns net: 0, vat: 0 for gross = 0n', () => {
      const result = extractVat(0n, 800);
      expect(result.net).toBe(0n);
      expect(result.vat).toBe(0n);
      expect(result.net + result.vat).toBe(0n);
    });

    it('returns net: gross, vat: 0 for rateBps <= 0', () => {
      const result = extractVat(500_000n, 0);
      expect(result.net).toBe(500_000n);
      expect(result.vat).toBe(0n);
      expect(result.net + result.vat).toBe(500_000n);
    });

    it('handles negative gross gracefully', () => {
      const result = extractVat(-100n, 800);
      expect(result.net).toBe(-100n);
      expect(result.vat).toBe(0n);
      expect(result.net + result.vat).toBe(-100n);
    });
  });

  describe('Standard VAT 8% (rateBps = 800)', () => {
    it('exact divisor: 1,080,000 VND -> net: 1,000,000 VND, vat: 80,000 VND', () => {
      const result = extractVat(1_080_000n, 800);
      expect(result.vat).toBe(80_000n);
      expect(result.net).toBe(1_000_000n);
      expect(result.net + result.vat).toBe(1_080_000n);
    });

    it('rounding case: 100,000 VND -> net: 92,593 VND, vat: 7,407 VND', () => {
      // 100,000 * 800 / 10,800 = 7407.4074... -> round to 7407
      const result = extractVat(100_000n, 800);
      expect(result.vat).toBe(7_407n);
      expect(result.net).toBe(92_593n);
      expect(result.net + result.vat).toBe(100_000n);
    });

    it('round half-up behavior at .5 fraction threshold', () => {
      // Find an amount where remainder * 2 >= denom
      // For denom 10800, denom / 2 = 5400.
      // (gross * 800) % 10800:
      // If gross = 27 -> gross * 800 = 21600 (exact 2).
      // If gross = 200_000 -> 200_000 * 800 = 160_000_000
      // 160_000_000 / 10800 = 14814.8148...
      const result = extractVat(200_000n, 800);
      expect(result.vat).toBe(14_815n);
      expect(result.net).toBe(185_185n);
      expect(result.net + result.vat).toBe(200_000n);
    });
  });

  describe('Standard VAT 10% (rateBps = 1000)', () => {
    it('exact divisor: 1,100,000 VND -> net: 1,000,000 VND, vat: 100,000 VND', () => {
      const result = extractVat(1_100_000n, 1000);
      expect(result.vat).toBe(100_000n);
      expect(result.net).toBe(1_000_000n);
      expect(result.net + result.vat).toBe(1_100_000n);
    });

    it('rounding case: 100,000 VND with 10% -> vat: 9,091 VND, net: 90,909 VND', () => {
      // 100,000 * 1000 / 11,000 = 9090.909... -> 9091
      const result = extractVat(100_000n, 1000);
      expect(result.vat).toBe(9_091n);
      expect(result.net).toBe(90_909n);
      expect(result.net + result.vat).toBe(100_000n);
    });
  });

  describe('Invariant Property: net + vat === gross for arbitrary amounts', () => {
    it('guarantees net + vat === gross for 1000 generated amounts', () => {
      const rates = [500, 800, 1000];
      for (const rate of rates) {
        for (let i = 1; i <= 1000; i++) {
          const gross = BigInt(i * 137 + (i % 7));
          const { net, vat } = extractVat(gross, rate);
          expect(net + vat).toBe(gross);
          expect(vat).toBeGreaterThanOrEqual(0n);
          expect(net).toBeGreaterThanOrEqual(0n);
        }
      }
    });

    it('guarantees invariant for typical e-commerce cart totals up to billions', () => {
      const sampleAmounts = [
        15_000n,
        49_000n,
        99_000n,
        150_000n,
        299_000n,
        350_000n,
        800_000n,
        1_250_000n,
        5_000_000n,
        25_000_000n,
        999_999_999n,
      ];

      for (const gross of sampleAmounts) {
        const { net, vat } = extractVat(gross, 800);
        expect(net + vat).toBe(gross);
      }
    });
  });
});
