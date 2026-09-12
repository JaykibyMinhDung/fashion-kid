export type InventoryItem = {
  id: string;
  sku: string;
  product: string;
  variant: string;
  warehouse: string;
  onHand: number;
  reserved: number;
  available: number;
};
