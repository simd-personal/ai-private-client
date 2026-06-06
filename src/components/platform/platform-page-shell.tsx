"use client";

import type { ReactNode } from "react";
import { PlatformNav } from "@/components/platform/platform-nav";

interface PlatformPageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PlatformPageShell({
  title,
  subtitle,
  actions,
  children,
}: PlatformPageShellProps) {
  return (
    <div className="min-h-screen bg-beige/20 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <PlatformNav />
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-navy">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
