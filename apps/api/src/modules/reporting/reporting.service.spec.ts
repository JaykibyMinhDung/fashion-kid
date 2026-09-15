import { BadRequestException } from '@nestjs/common';
import { ReportingService } from './reporting.service';

describe('ReportingService range contract', () => {
  const service = new ReportingService({} as never);

  it('defaults to the last 30 days and business timezone', () => {
    const result = service.range({});
    expect(result.timezone).toBe('Asia/Ho_Chi_Minh');
    expect(result.granularity).toBe('day');
    expect(result.to.getTime() - result.from.getTime()).toBe(30 * 86_400_000);
  });

  it('rejects an inverted range', () => {
    expect(() =>
      service.range({
        from: '2026-09-02T00:00:00Z',
        to: '2026-09-01T00:00:00Z',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a range beyond 366 days', () => {
    expect(() =>
      service.range({
        from: '2024-01-01T00:00:00Z',
        to: '2026-01-01T00:00:00Z',
      }),
    ).toThrow('REPORT_RANGE_TOO_LARGE');
  });

  it('chooses bounded default granularity', () => {
    expect(
      service.range({
        from: '2026-01-01T00:00:00Z',
        to: '2026-02-02T00:00:00Z',
      }).granularity,
    ).toBe('week');
    expect(
      service.range({
        from: '2025-01-01T00:00:00Z',
        to: '2026-01-01T00:00:00Z',
      }).granularity,
    ).toBe('month');
  });
});
