"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

import { isExternalImageUrl } from "@/lib/image";

const DEFAULT_FALLBACK_SRC = "/images/kids-fashion-hero.png";

type SafeImageProps = Omit<ImageProps, "src" | "alt" | "onError"> & {
  src: string;
  alt: string;
  fallbackSrc?: string;
};

export function SafeImage({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK_SRC,
  unoptimized,
  ...props
}: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolvedSrc = failedSrc === src ? fallbackSrc : src;

  return (
    <Image
      {...props}
      src={resolvedSrc}
      alt={alt}
      unoptimized={unoptimized || isExternalImageUrl(resolvedSrc)}
      onError={() => {
        if (src !== fallbackSrc) setFailedSrc(src);
      }}
    />
  );
}
