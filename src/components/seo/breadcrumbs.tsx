import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { SeoBreadcrumb } from "@/lib/seo/types";

export function Breadcrumbs({ items }: { items: SeoBreadcrumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
        <li>
          <Link href="/" className="transition hover:text-navy">
            Home
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
            {item.href ? (
              <Link href={item.href} className="transition hover:text-navy">
                {item.label}
              </Link>
            ) : (
              <span className="text-navy">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
