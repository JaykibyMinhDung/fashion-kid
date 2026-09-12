export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: string;
  compareAtPrice?: string;
  image: string;
  imageAlt: string;
  badge?: string;
  colors: string[];
  sizes: string[];
  available: number;
};
