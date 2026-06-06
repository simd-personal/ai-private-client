import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ReportCard({ title, children, className }: ReportCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 text-gray-700 leading-relaxed">
        {children}
      </CardContent>
    </Card>
  );
}
