import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-sm hover:bg-brand-strong active:translate-y-px",
  secondary: "bg-sage text-white hover:bg-[#667657] active:translate-y-px",
  ghost: "bg-transparent text-foreground hover:bg-surface-soft",
  outline:
    "border border-border bg-surface text-foreground hover:border-brand hover:text-brand-strong",
};

// cn() chỉ nối chuỗi class (không gộp xung đột Tailwind), nên KHÔNG ghi đè h-/px-/size-
// của một size bằng className: class nào thắng phụ thuộc thứ tự CSS. Cần kích thước
// khác thì thêm size ở đây.
const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-6 px-2 text-[11px]",
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-base",
  icon: "h-9 w-9 p-0",
  "icon-sm": "h-8 w-8 p-0",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  children,
  className,
  variant = "primary",
  size = "md",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, className })}>
      {children}
    </Link>
  );
}
