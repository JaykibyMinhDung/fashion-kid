import { GhnStatusMapper } from './ghn-status.mapper';

describe('GhnStatusMapper (Unit Test Matrix - Status Mapper)', () => {
  it('should map representative GHN statuses correctly', () => {
    expect(GhnStatusMapper.toDomainStatus('ready_to_pick')).toBe(
      'READY_TO_PICK',
    );
    expect(GhnStatusMapper.toDomainStatus('picking')).toBe('PICKING');
    expect(GhnStatusMapper.toDomainStatus('storing')).toBe('PICKING');
    expect(GhnStatusMapper.toDomainStatus('transporting')).toBe('IN_TRANSIT');
    expect(GhnStatusMapper.toDomainStatus('sorting')).toBe('IN_TRANSIT');
    expect(GhnStatusMapper.toDomainStatus('delivering')).toBe('DELIVERING');
    expect(GhnStatusMapper.toDomainStatus('money_collect_delivering')).toBe(
      'DELIVERING',
    );
    expect(GhnStatusMapper.toDomainStatus('delivered')).toBe('DELIVERED');
    expect(GhnStatusMapper.toDomainStatus('cancel')).toBe('CANCELLED');
    expect(GhnStatusMapper.toDomainStatus('cancelled')).toBe('CANCELLED');
    expect(GhnStatusMapper.toDomainStatus('return')).toBe('RETURNING');
    expect(GhnStatusMapper.toDomainStatus('returned')).toBe('RETURNED');
    expect(GhnStatusMapper.toDomainStatus('damage')).toBe('EXCEPTION');
    expect(GhnStatusMapper.toDomainStatus('lost')).toBe('EXCEPTION');
  });

  it('should safely map unknown strings to EXCEPTION', () => {
    expect(GhnStatusMapper.toDomainStatus('unknown_future_status')).toBe(
      'EXCEPTION',
    );
    expect(GhnStatusMapper.toDomainStatus('')).toBe('EXCEPTION');
    expect(GhnStatusMapper.toDomainStatus(null)).toBe('EXCEPTION');
    expect(GhnStatusMapper.toDomainStatus(undefined)).toBe('EXCEPTION');
  });

  it('should return simplified customer friendly strings', () => {
    expect(GhnStatusMapper.toSimplifiedStatus('READY_TO_PICK')).toBe(
      'Chờ lấy hàng',
    );
    expect(GhnStatusMapper.toSimplifiedStatus('DELIVERED')).toBe(
      'Đã giao hàng',
    );
    expect(GhnStatusMapper.toSimplifiedStatus('EXCEPTION')).toBe(
      'Đang cập nhật',
    );
  });
});
