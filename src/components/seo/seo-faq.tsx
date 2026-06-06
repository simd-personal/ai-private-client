import type { SeoFaqItem } from "@/lib/seo/types";

export function SeoFaq({ faqs }: { faqs: SeoFaqItem[] }) {
  return (
    <div className="space-y-4">
      {faqs.map((faq) => (
        <details
          key={faq.question}
          className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <summary className="cursor-pointer list-none font-medium text-navy marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-start justify-between gap-4">
              {faq.question}
              <span className="text-champagne transition group-open:rotate-45">
                +
              </span>
            </span>
          </summary>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
