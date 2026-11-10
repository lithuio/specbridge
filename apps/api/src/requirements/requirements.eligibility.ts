import type {
  requirementRevisions,
  clarifications,
} from '../database/schema/index.js';
export function validRevision(
  latestId: string | null,
  latest: typeof requirementRevisions.$inferSelect | undefined,
) {
  return Boolean(
    latest &&
    latest.id === latestId &&
    latest.content.trim() &&
    latest.acceptanceCriteria.length &&
    latest.acceptanceCriteria.every((s) => s.trim()),
  );
}
export function unanswered(questions: (typeof clarifications.$inferSelect)[]) {
  const answered = new Set(
    questions
      .filter((q) => q.kind === 'ANSWER' && q.body.trim())
      .map((q) => q.parentId),
  );
  return questions.some((q) => q.kind === 'QUESTION' && !answered.has(q.id));
}
