import { CopyBlock } from "@/components/ai/CopyBlock";
import { ReportCard } from "@/components/report/report-card";
import type { MeetingPrepPack } from "@/lib/schemas/ai-strategy-room";

interface MeetingPrepPackProps {
  data: MeetingPrepPack;
  onCopy?: () => void;
}

export function MeetingPrepPackPanel({ data, onCopy }: MeetingPrepPackProps) {
  return (
    <ReportCard title="Meeting Prep Pack">
      <div className="mb-4 flex justify-end">
        <CopyBlock
          text={[
            data.callOpener,
            "",
            "Discovery Questions:",
            ...data.discoveryQuestions.map((q) => `- ${q}`),
            "",
            "Meeting Agenda:",
            ...data.meetingAgenda.map((a) => `- ${a}`),
          ].join("\n")}
          label="Copy Prep Pack"
          onCopied={onCopy}
        />
      </div>

      <div className="space-y-5 text-sm">
        <Section title="Call Opener" content={data.callOpener} />
        <ListSection title="Discovery Questions" items={data.discoveryQuestions} />
        <ListSection title="Likely Objections" items={data.likelyObjections} />
        <ListSection title="Suggested Responses" items={data.suggestedResponses} />
        <ListSection title="Meeting Agenda" items={data.meetingAgenda} ordered />
        <ListSection title="Documents to Request" items={data.documentsToRequest} />
        <Section
          title="Recommended Follow-Up Timeline"
          content={data.recommendedFollowUpTimeline}
        />
      </div>
    </ReportCard>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-xl bg-beige/20 p-4">
      <p className="mb-1 font-medium text-navy">{title}</p>
      <p className="text-gray-600">{content}</p>
    </div>
  );
}

function ListSection({
  title,
  items,
  ordered,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <div>
      <p className="mb-2 font-medium text-navy">{title}</p>
      <Tag className={`space-y-1 pl-5 text-gray-600 ${ordered ? "list-decimal" : "list-disc"}`}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </Tag>
    </div>
  );
}
