import type { MeetingSummary } from "@/lib/schemas/decision-layer";

const QUESTION_STARTERS = [
  "what",
  "when",
  "how",
  "who",
  "why",
  "should we",
  "can we",
  "is there",
  "?",
];

function extractSentences(text: string): string[] {
  return text
    .split(/[\n.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

function looksLikeQuestion(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  return QUESTION_STARTERS.some((q) => lower.includes(q));
}

function looksLikeDecision(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  return (
    lower.includes("decided") ||
    lower.includes("agreed") ||
    lower.includes("will proceed") ||
    lower.includes("confirmed") ||
    lower.includes("plan to")
  );
}

export function generateMeetingSummary(noteBody: string): MeetingSummary {
  const sentences = extractSentences(noteBody);
  const decisionsMade = sentences.filter(looksLikeDecision).slice(0, 5);
  const unresolvedQuestions = sentences.filter(looksLikeQuestion).slice(0, 6);
  const newFacts = sentences
    .filter((s) => !looksLikeQuestion(s) && !looksLikeDecision(s))
    .slice(0, 5);

  const advisorFollowUps = unresolvedQuestions.map(
    (q) => `Advisor review: ${q.replace(/\?$/, "")} — item to verify`
  );

  const dataRoomUpdates = newFacts
    .filter((f) =>
      /document|statement|policy|record|title|mortgage|trust|entity/i.test(f)
    )
    .map((f) => `Request documentation: ${f.slice(0, 100)}`);

  return {
    summary:
      sentences.slice(0, 2).join(". ") ||
      "Meeting notes captured for advisor review.",
    decisionsMade:
      decisionsMade.length > 0
        ? decisionsMade
        : ["No explicit decisions recorded — advisor review recommended."],
    newFacts:
      newFacts.length > 0
        ? newFacts
        : ["Review meeting notes for additional context."],
    unresolvedQuestions:
      unresolvedQuestions.length > 0
        ? unresolvedQuestions
        : ["No open questions extracted — confirm with advisory team."],
    advisorFollowUps: advisorFollowUps.slice(0, 5),
    suggestedClientFollowUp:
      "Thank you for today's conversation. Your advisory team will follow up on the planning topics discussed and any items to verify before the next step.",
    dataRoomUpdates: dataRoomUpdates.slice(0, 4),
    decisionGraphUpdates: unresolvedQuestions
      .slice(0, 3)
      .map((q) => `Add planning topic: ${q}`),
  };
}
