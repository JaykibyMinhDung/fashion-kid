export interface SellerSnapshot {
  name: string;
  address: string;
  taxCode: string;
  phone: string;
  email?: string;
}

export interface BuyerSnapshot {
  receiverName: string;
  receiverPhone: string;
  addressLine: string;
  wardName: string;
  wardCode?: string;
  provinceName: string;
  provinceCode?: string;
  customerEmail?: string | null;
}

export interface TaxConfig {
  defaultRateBps: number;
  priceMode: 'INCLUSIVE';
  issueOn: 'ORDER_CREATED' | 'ORDER_COMPLETED';
  seller: SellerSnapshot;
}
