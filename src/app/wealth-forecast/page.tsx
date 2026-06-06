import { WealthForecastQuiz } from "@/components/quiz/wealth-forecast-quiz";

export const metadata = {
  title: "Wealth Forecast Brief | Private Client Property Desk",
  description:
    "Model a California real estate purchase across appreciation scenarios, leverage, ownership costs, and planning topics for entrepreneurs and liquidity-event buyers.",
};

export default function WealthForecastPage() {
  return <WealthForecastQuiz />;
}
