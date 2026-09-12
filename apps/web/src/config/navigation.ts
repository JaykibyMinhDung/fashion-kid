export type NavigationItem = {
  label: string;
  href: string;
  icon?: "home" | "box" | "layers" | "warehouse" | "users" | "user" | "key" | "map" | "receipt";
};

export const storeNavigation: NavigationItem[] = [
  { label: "Hàng mới", href: "/products?sort=newest" },
  { label: "Bé gái", href: "/products?category=be-gai" },
  { label: "Bé trai", href: "/products?category=be-trai" },
  { label: "Sơ sinh", href: "/products?category=so-sinh" },
];

export const accountNavigation: NavigationItem[] = [
  { label: "Đơn hàng của tôi", href: "/account/orders", icon: "receipt" },
  { label: "Hồ sơ cá nhân", href: "/account/profile", icon: "user" },
  { label: "Địa chỉ nhận hàng", href: "/account/addresses", icon: "map" },
  { label: "Đổi mật khẩu", href: "/account/password", icon: "key" },
];

export const adminNavigation: NavigationItem[] = [
  { label: "Tổng quan", href: "/admin/dashboard", icon: "home" },
  { label: "Đơn hàng", href: "/admin/orders", icon: "receipt" },
  { label: "Người dùng", href: "/admin/users", icon: "users" },
  { label: "Sản phẩm", href: "/admin/products", icon: "box" },
  { label: "Danh mục", href: "/admin/categories", icon: "layers" },
  { label: "Tồn kho", href: "/admin/inventory", icon: "warehouse" },
];

export const salesNavigation: NavigationItem[] = [
  { label: "Tổng quan", href: "/sales/dashboard", icon: "home" },
  { label: "Đơn hàng", href: "/sales/orders", icon: "receipt" },
];

export const warehouseNavigation: NavigationItem[] = [
  { label: "Tổng quan", href: "/warehouse/dashboard", icon: "home" },
  { label: "Đơn hàng", href: "/warehouse/orders", icon: "receipt" },
  { label: "Tồn kho", href: "/warehouse/inventory", icon: "warehouse" },
];
