import { ResultPageContent } from "@/components/report/result-page-content";

export const metadata = {
  title: "Your Private Decision Brief | Private Client Property Desk",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResultPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-beige/20 to-white">
      <ResultPageContent />
    </div>
  );
}
