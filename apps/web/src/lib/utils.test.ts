import { describe, expect, it } from "vitest";

import { cn, formatCompactNumber, formatCurrency } from "@/lib/utils";

describe("shared utilities", () => {
  it("joins only enabled class names", () => {
    expect(cn("card", false, null, undefined, "card--active")).toBe(
      "card card--active",
    );
  });

  it("formats VND values for Vietnamese users", () => {
    const formatted = formatCurrency(349_000);

    expect(formatted).toMatch(/349\.000/);
    expect(formatted).toContain("₫");
  });

  it("keeps compact numbers readable", () => {
    expect(formatCompactNumber(1_200)).toMatch(/1,2.*N/iu);
  });
});
