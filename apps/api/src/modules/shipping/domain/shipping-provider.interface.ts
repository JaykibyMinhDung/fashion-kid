export type ShippingAddressInput = {
  addressLine: string;
  wardCode: string;
  wardName: string;
  provinceCode: string;
  provinceName: string;
};

export type ShippingParcelItem = {
  variantId: string;
  quantity: number;
  unitPrice: string;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
};

export type CalculateShippingQuoteParams = {
  toAddress: ShippingAddressInput;
  items: ShippingParcelItem[];
  totalWeightGrams: number;
};

export type ShippingQuoteResult = {
  fee: bigint;
  source: 'PROVIDER' | 'FALLBACK';
  provider?: string;
  serviceCode?: string;
  serviceName?: string;
  estimatedDays?: number;
  metadata?: Record<string, unknown>;
};

export abstract class ShippingProvider {
  abstract readonly name: string;
  abstract calculateQuote(
    params: CalculateShippingQuoteParams,
  ): Promise<ShippingQuoteResult>;
}
