import type { Product } from "@/types/catalog";

export const featuredProducts: Product[] = [
  {
    id: "prd-001",
    slug: "set-ao-khoac-coral",
    name: "Set áo khoác Coral",
    category: "Bộ mặc ngoài",
    price: "349000",
    compareAtPrice: "399000",
    image: "/images/product-coral-cardigan.png",
    imageAlt: "Áo khoác len màu coral phối cùng romper màu kem",
    badge: "Mới",
    colors: ["Coral", "Kem"],
    sizes: ["80", "90", "100", "110"],
    available: 18,
  },
  {
    id: "prd-002",
    slug: "set-so-mi-sage",
    name: "Set sơ mi Sage",
    category: "Bộ bé trai",
    price: "289000",
    image: "/images/product-sage-set.png",
    imageAlt: "Áo sơ mi linen xanh sage phối quần short màu be",
    badge: "Bán chạy",
    colors: ["Sage", "Be"],
    sizes: ["90", "100", "110", "120"],
    available: 24,
  },
  {
    id: "prd-003",
    slug: "romper-muslin-apricot",
    name: "Romper Muslin Apricot",
    category: "Sơ sinh",
    price: "239000",
    image: "/images/product-apricot-romper.png",
    imageAlt: "Romper muslin màu kem với mũ bonnet màu apricot",
    badge: "Mềm mại",
    colors: ["Kem", "Apricot"],
    sizes: ["60", "70", "80", "90"],
    available: 12,
  },
];

export function getProductBySlug(slug: string) {
  return featuredProducts.find((product) => product.slug === slug);
}
