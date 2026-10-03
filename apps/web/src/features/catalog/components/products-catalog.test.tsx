import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getCatalogFilters,
  getProducts,
  type CatalogProductList,
} from "@/features/catalog/api/catalog-client";
import { ProductsCatalog } from "./products-catalog";

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("@/features/catalog/api/catalog-client", () => ({
  getProducts: vi.fn(),
  getCatalogFilters: vi.fn(),
}));

const categories = [
  { id: "girl", name: "Bé gái", slug: "be-gai", parentId: null },
  { id: "boy", name: "Bé trai", slug: "be-trai", parentId: null },
  { id: "baby", name: "Sơ sinh", slug: "so-sinh", parentId: null },
];

function products(category = ""): CatalogProductList {
  const selected = category
    ? categories.filter((item) => item.slug === category)
    : categories;
  return {
    items: selected.map((item) => ({
      id: item.id,
      slug: `san-pham-${item.slug}`,
      name: `Sản phẩm ${item.name}`,
      gender: null,
      ageGroup: null,
      category: item,
      brand: null,
      primaryImage: null,
      minPrice: "100000",
      maxPrice: "100000",
    })),
    page: 1,
    limit: 20,
    total: selected.length,
    totalPages: 1,
  };
}

beforeEach(() => {
  searchParams = new URLSearchParams();
  vi.mocked(getCatalogFilters).mockReset().mockResolvedValue({
    categories,
    brands: [],
    sizes: [],
    colors: [],
  });
  vi.mocked(getProducts)
    .mockReset()
    .mockImplementation((query) => Promise.resolve(products(query?.category)));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ProductsCatalog URL filters", () => {
  it("uses all URL filters, including header search and sorting", async () => {
    searchParams = new URLSearchParams({
      q: "áo bé",
      category: "be-gai",
      brand: "mam-nho",
      size: "90",
      color: "CORAL",
      sort: "price_desc",
    });
    render(<ProductsCatalog />);

    await screen.findByRole("link", { name: "Sản phẩm Bé gái" });
    expect(getProducts).toHaveBeenLastCalledWith({
      q: "áo bé",
      category: "be-gai",
      brand: "mam-nho",
      size: "90",
      color: "CORAL",
      sort: "price_desc",
      page: 1,
      limit: 20,
    });
    expect(screen.getByPlaceholderText("Tên sản phẩm...")).toHaveValue("áo bé");
    expect(screen.getByRole("combobox", { name: /^Danh mục/ })).toHaveValue(
      "be-gai",
    );
    expect(
      screen.getByRole("combobox", { name: "Sắp xếp sản phẩm" }),
    ).toHaveValue("price_desc");
  });

  it("reloads the same mounted catalog on category navigation, reset and back", async () => {
    const { rerender } = render(<ProductsCatalog />);
    await screen.findByRole("link", { name: "Sản phẩm Bé gái" });

    for (const category of ["be-gai", "be-trai", "so-sinh", "", "so-sinh"]) {
      searchParams = new URLSearchParams(
        category ? { category } : { sort: "newest" },
      );
      rerender(<ProductsCatalog />);

      const expected =
        categories.find((item) => item.slug === category) ?? categories[0];
      await screen.findByRole("link", {
        name: `Sản phẩm ${expected.name}`,
      });
      expect(getProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ category }),
      );
      expect(screen.getByRole("combobox", { name: /^Danh mục/ })).toHaveValue(
        category,
      );
      expect(
        screen.getAllByRole("link", { name: /^Xem Sản phẩm/ }),
      ).toHaveLength(category ? 1 : 3);
    }
    expect(getCatalogFilters).toHaveBeenCalledTimes(1);
  });

  it("writes sidebar filters to the URL, preserves other filters and resets page", async () => {
    searchParams = new URLSearchParams(
      "q=ao&category=be-gai&sort=price_asc&page=3",
    );
    const replace = vi.spyOn(window.history, "replaceState");
    const { rerender } = render(<ProductsCatalog />);
    await screen.findByRole("link", { name: "Sản phẩm Bé gái" });

    fireEvent.change(screen.getByRole("combobox", { name: /^Danh mục/ }), {
      target: { value: "so-sinh" },
    });
    const nextUrl = String(replace.mock.calls.at(-1)?.[2]);
    const nextParams = new URL(nextUrl, "http://localhost:3000").searchParams;
    expect(nextParams.get("category")).toBe("so-sinh");
    expect(nextParams.get("q")).toBe("ao");
    expect(nextParams.get("sort")).toBe("price_asc");
    expect(nextParams.has("page")).toBe(false);

    // Next's history integration notifies useSearchParams; simulate that render.
    searchParams = nextParams;
    rerender(<ProductsCatalog />);
    await screen.findByRole("link", { name: "Sản phẩm Sơ sinh" });
    expect(getProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: "so-sinh", page: 1 }),
    );
    replace.mockRestore();
  });

  it("removes an empty category filter from the URL", async () => {
    searchParams = new URLSearchParams("category=be-gai");
    const replace = vi.spyOn(window.history, "replaceState");
    render(<ProductsCatalog />);
    await screen.findByRole("link", { name: "Sản phẩm Bé gái" });

    fireEvent.change(screen.getByRole("combobox", { name: /^Danh mục/ }), {
      target: { value: "" },
    });
    expect(replace).toHaveBeenLastCalledWith(null, "", "/products");
    replace.mockRestore();
  });

  it("shows loading instead of products from the previous category", async () => {
    searchParams = new URLSearchParams("category=be-gai");
    const { rerender } = render(<ProductsCatalog />);
    await screen.findByRole("link", { name: "Sản phẩm Bé gái" });
    let finish!: (value: CatalogProductList) => void;
    vi.mocked(getProducts).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );

    searchParams = new URLSearchParams("category=so-sinh");
    rerender(<ProductsCatalog />);
    expect(screen.getByLabelText("Đang tải")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sản phẩm Bé gái" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^Danh mục/ })).toHaveValue(
      "so-sinh",
    );

    await act(async () => finish(products("so-sinh")));
    await screen.findByRole("link", { name: "Sản phẩm Sơ sinh" });
  });

  it("does not let a slower previous request overwrite the selected category", async () => {
    let finishOld!: (value: CatalogProductList) => void;
    vi.mocked(getProducts).mockReturnValueOnce(
      new Promise((resolve) => {
        finishOld = resolve;
      }),
    );
    searchParams = new URLSearchParams("category=be-gai");
    const { rerender } = render(<ProductsCatalog />);
    await waitFor(() => expect(getProducts).toHaveBeenCalledTimes(1));

    searchParams = new URLSearchParams("category=so-sinh");
    rerender(<ProductsCatalog />);
    await screen.findByRole("link", { name: "Sản phẩm Sơ sinh" });
    await act(async () => finishOld(products("be-gai")));
    expect(
      screen.getByRole("link", { name: "Sản phẩm Sơ sinh" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sản phẩm Bé gái" }),
    ).not.toBeInTheDocument();
  });

  it("retries the current category after an API error", async () => {
    searchParams = new URLSearchParams("category=so-sinh");
    vi.mocked(getProducts).mockRejectedValueOnce(new Error("network error"));
    render(<ProductsCatalog />);
    fireEvent.click(await screen.findByRole("button", { name: /Thử lại/ }));
    await screen.findByRole("link", { name: "Sản phẩm Sơ sinh" });
    expect(getProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: "so-sinh" }),
    );
  });

  it("falls back to newest for an unsupported sort parameter", async () => {
    searchParams = new URLSearchParams("sort=unsupported");
    render(<ProductsCatalog />);
    await screen.findByRole("link", { name: "Sản phẩm Bé gái" });
    expect(getProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: "newest" }),
    );
  });
});
