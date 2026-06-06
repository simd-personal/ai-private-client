import { CopyBlock } from "@/components/ai/CopyBlock";
import { ReportCard } from "@/components/report/report-card";
import type { WhiteGloveFollowUp } from "@/lib/schemas/ai-strategy-room";

interface WhiteGloveFollowUpProps {
  data: WhiteGloveFollowUp;
  onCopy?: (field: string) => void;
}

export function WhiteGloveFollowUpPanel({
  data,
  onCopy,
}: WhiteGloveFollowUpProps) {
  return (
    <ReportCard title="White-Glove Follow-Up">
      <div className="space-y-5 text-sm">
        <CopySection
          title="SMS Follow-Up"
          text={data.smsFollowUp}
          onCopy={() => onCopy?.("sms")}
        />
        <CopySection
          title="Email Subject"
          text={data.emailSubject}
          onCopy={() => onCopy?.("email_subject")}
        />
        <CopySection
          title="Email Body"
          text={data.emailBody}
          onCopy={() => onCopy?.("email_body")}
        />
        <CopySection
          title="Advisor Intro Email"
          text={data.advisorIntroEmail}
          onCopy={() => onCopy?.("advisor_intro")}
        />
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="font-medium text-navy">Internal Team Note</p>
            <CopyBlock
              text={data.internalTeamNote}
              onCopied={() => onCopy?.("internal_note")}
            />
          </div>
          <p className="text-gray-600">{data.internalTeamNote}</p>
        </div>
      </div>
    </ReportCard>
  );
}

function CopySection({
  title,
  text,
  onCopy,
}: {
  title: string;
  text: string;
  onCopy?: () => void;
}) {
  return (
    <div className="rounded-xl bg-beige/20 p-4">
      <div className="mb-1 flex items-center justify-between">
        <p className="font-medium text-navy">{title}</p>
        <CopyBlock text={text} onCopied={onCopy} />
      </div>
      <p className="whitespace-pre-wrap text-gray-600">{text}</p>
    </div>
  );
}
