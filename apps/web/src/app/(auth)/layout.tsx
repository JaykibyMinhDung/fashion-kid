import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-surface lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative hidden overflow-hidden bg-surface-soft lg:block">
        <Image
          src="/images/kids-fashion-hero.png"
          alt="Bộ sưu tập thời trang trẻ em của Mầm Nhỏ"
          fill
          priority
          sizes="50vw"
          className="object-cover object-[60%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-transparent to-transparent" />
        <div className="absolute inset-x-10 bottom-10 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em]">Mầm Nhỏ</p>
          <h1 className="mt-3 max-w-xl text-4xl font-black tracking-[-0.05em]">
            Một tài khoản cho mọi hành trình mua sắm và vận hành.
          </h1>
        </div>
      </section>
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16">
        <Link href="/" className="flex items-center gap-2 self-start">
          <span className="grid size-9 place-items-center rounded-full bg-brand font-black text-white">M</span>
          <span className="font-black">Mầm Nhỏ</span>
        </Link>
        <div className="my-auto w-full max-w-md self-center py-10">{children}</div>
      </section>
    </main>
  );
}
