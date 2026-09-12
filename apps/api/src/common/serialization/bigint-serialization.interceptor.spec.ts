import { serializeBigInts } from './bigint-serialization.interceptor';

describe('serializeBigInts', () => {
  it('serializes money values to strict decimal strings recursively', () => {
    expect(
      serializeBigInts({
        subtotal: 349000n,
        lines: [{ unitPrice: 349000n, quantity: 1 }],
      }),
    ).toEqual({
      subtotal: '349000',
      lines: [{ unitPrice: '349000', quantity: 1 }],
    });
  });

  it('preserves dates and buffers', () => {
    const date = new Date('2026-09-01T00:00:00.000Z');
    const buffer = Buffer.from('test');

    expect(serializeBigInts({ date, buffer })).toEqual({ date, buffer });
  });
});
