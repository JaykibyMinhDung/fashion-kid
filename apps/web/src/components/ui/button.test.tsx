import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button, ButtonLink } from "@/components/ui/button";

describe("Button", () => {
  it("does not submit a form unless explicitly requested", () => {
    render(<Button>Lưu thay đổi</Button>);

    expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("renders navigation actions with the expected destination", () => {
    render(<ButtonLink href="/products">Xem sản phẩm</ButtonLink>);

    expect(screen.getByRole("link", { name: "Xem sản phẩm" })).toHaveAttribute(
      "href",
      "/products",
    );
  });
});
