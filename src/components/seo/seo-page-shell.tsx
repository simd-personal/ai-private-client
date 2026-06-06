import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { AiDisclaimer } from "@/components/report/ai-disclaimer";
import { getTenantDisclaimer } from "@/lib/tenants/tenant-config";

export function SeoPageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-white">{children}</div>
      <section className="border-t border-gray-100 bg-beige/20 px-6 py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <AiDisclaimer />
          <p className="text-xs leading-relaxed text-gray-500">
            {getTenantDisclaimer()}
          </p>
        </div>
      </section>
    </>
  );
}
