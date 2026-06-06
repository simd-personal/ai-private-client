"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProgressBar } from "@/components/quiz/progress-bar";
import { Button } from "@/components/ui/button";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";
import { tenantPathFromPathname } from "@/lib/tenants/tenant-paths";

interface QuizShellProps {
  title: string;
  currentStep: number;
  totalSteps: number;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  isLoading?: boolean;
  showNav?: boolean;
}

export function QuizShell({
  title,
  currentStep,
  totalSteps,
  children,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  isLoading,
  showNav = true,
}: QuizShellProps) {
  const pathname = usePathname();
  const tenant = useCurrentTenant();
  return (
    <div className="min-h-screen bg-gradient-to-b from-beige/20 to-white">
      <div className="mx-auto max-w-lg px-6 py-8">
        <Link
          href={tenantPathFromPathname(pathname, "/")}
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <p className="mb-2 text-xs text-gray-500">
          {tenant.brandName} · {tenant.agentName}
        </p>

        <p className="mb-2 text-xs tracking-[0.2em] text-champagne uppercase">
          {title}
        </p>
        <ProgressBar current={currentStep} total={totalSteps} className="mb-10" />

        <div className="mb-10 min-h-[320px]">{children}</div>

        {showNav && (
          <div className="flex gap-3">
            {onBack && currentStep > 1 && (
              <Button variant="ghost" onClick={onBack} className="flex-1">
                Back
              </Button>
            )}
            {onNext && (
              <Button
                onClick={onNext}
                disabled={nextDisabled || isLoading}
                className="flex-1"
              >
                {isLoading ? "Generating your plan..." : nextLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
