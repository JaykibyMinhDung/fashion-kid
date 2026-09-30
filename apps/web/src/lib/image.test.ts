import { describe, expect, it } from "vitest";

import { isExternalImageUrl } from "@/lib/image";

describe("isExternalImageUrl", () => {
  it.each([
    ["/images/product.png", false],
    ["https://example.test/image.png", true],
    ["http://cdn.example.test/image.png", true],
    ["//cdn.example.test/image.png", true],
    ["data:image/png;base64,abc", false],
    ["not-an-url", false],
  ])("classifies %s as %s", (source, expected) => {
    expect(isExternalImageUrl(source)).toBe(expected);
  });
});
