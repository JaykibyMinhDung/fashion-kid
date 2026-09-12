import type { InventoryItem } from "@/types/inventory";

export const inventoryItems: InventoryItem[] = [
  {
    id: "inv-001",
    sku: "CORAL-CRM-090",
    product: "Set áo khoác Coral",
    variant: "Coral / 90",
    warehouse: "Kho chính",
    onHand: 12,
    reserved: 2,
    available: 10,
  },
  {
    id: "inv-002",
    sku: "SAGE-BEI-100",
    product: "Set sơ mi Sage",
    variant: "Sage / 100",
    warehouse: "Kho chính",
    onHand: 18,
    reserved: 4,
    available: 14,
  },
  {
    id: "inv-003",
    sku: "APRI-CRM-070",
    product: "Romper Muslin Apricot",
    variant: "Kem / 70",
    warehouse: "Kho chính",
    onHand: 5,
    reserved: 1,
    available: 4,
  },
];
