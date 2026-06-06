import type { ReactNode } from "react";

export function SeoSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-6 py-12 md:py-14 ${className}`}>
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-6 font-serif text-2xl text-navy md:text-3xl">{title}</h2>
        {children}
      </div>
    </section>
  );
}
