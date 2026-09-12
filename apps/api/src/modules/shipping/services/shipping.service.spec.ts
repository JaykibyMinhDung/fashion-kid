import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AddressService } from '../../users/address.service';
import { ShippingQuoteTokenService } from './shipping-quote-token.service';
import { ShippingService } from './shipping.service';

describe('ShippingService', () => {
  let service: ShippingService;
  let mockAddressService: { findOwnById: jest.Mock };
  let mockShippingProvider: { name: string; calculateQuote: jest.Mock };
  let mockPrisma: { cart: { findUnique: jest.Mock } };
  let mockQuoteTokens: { issue: jest.Mock; verify: jest.Mock };

  beforeEach(() => {
    mockAddressService = {
      findOwnById: jest.fn(),
    };
    mockShippingProvider = {
      name: 'MOCK_PROVIDER',
      calculateQuote: jest.fn(),
    };
    mockPrisma = { cart: { findUnique: jest.fn() } };
    mockQuoteTokens = {
      issue: jest.fn().mockReturnValue({
        quoteFingerprint: 'signed-quote',
        expiresAt: '2026-09-09T12:05:00.000Z',
      }),
      verify: jest.fn(),
    };

    service = new ShippingService(
      mockAddressService as unknown as AddressService,
      mockShippingProvider,
      mockPrisma as unknown as PrismaService,
      mockQuoteTokens as unknown as ShippingQuoteTokenService,
    );
  });

  it('calculates shipping quote successfully for an existing owned address', async () => {
    mockAddressService.findOwnById.mockResolvedValue({
      id: 'addr-1',
      receiverName: 'Nguyen Van A',
      phone: '+84901234567',
      addressLine: '123 Le Loi',
      wardCode: 'W1',
      wardName: 'Phuong Ben Nghe',
      provinceCode: 'P1',
      provinceName: 'TP Ho Chi Minh',
    });

    mockShippingProvider.calculateQuote.mockResolvedValue({
      fee: 30000n,
      source: 'FALLBACK',
      provider: 'STANDARD_FALLBACK',
      serviceCode: 'STANDARD',
      serviceName: 'Giao hàng tiêu chuẩn',
      estimatedDays: 3,
    });
    mockPrisma.cart.findUnique.mockResolvedValue({
      items: [
        {
          variantId: 'variant-1',
          quantity: 2,
          variant: {
            price: 150000n,
            weightGrams: 200,
            lengthCm: 20,
            widthCm: 15,
            heightCm: 5,
          },
        },
      ],
    });

    const result = await service.calculateQuoteForUserAddress(
      'user-1',
      'addr-1',
    );

    expect(result).toEqual({
      fee: '30000',
      source: 'FALLBACK',
      provider: 'STANDARD_FALLBACK',
      serviceCode: 'STANDARD',
      serviceName: 'Giao hàng tiêu chuẩn',
      estimatedDays: 3,
      metadata: undefined,
      quoteFingerprint: 'signed-quote',
      expiresAt: '2026-09-09T12:05:00.000Z',
    });
    expect(mockAddressService.findOwnById).toHaveBeenCalledWith(
      'user-1',
      'addr-1',
    );
    expect(mockShippingProvider.calculateQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        totalWeightGrams: 400,
        items: [
          expect.objectContaining({
            variantId: 'variant-1',
            quantity: 2,
            unitPrice: '150000',
          }),
        ],
      }),
    );
  });

  it('throws NotFoundException if the address is not found or not owned by the user', async () => {
    mockAddressService.findOwnById.mockResolvedValue(null);

    await expect(
      service.calculateQuoteForUserAddress('user-1', 'addr-invalid'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects quote calculation for an empty cart', async () => {
    mockAddressService.findOwnById.mockResolvedValue({
      addressLine: '123 Le Loi',
      wardCode: 'W1',
      wardName: 'Ward 1',
      provinceCode: 'P1',
      provinceName: 'Province 1',
    });
    mockPrisma.cart.findUnique.mockResolvedValue({ items: [] });

    await expect(
      service.calculateQuoteForUserAddress('user-1', 'addr-1'),
    ).rejects.toMatchObject({ code: 'CART_EMPTY' });
    expect(mockShippingProvider.calculateQuote).not.toHaveBeenCalled();
  });
});
