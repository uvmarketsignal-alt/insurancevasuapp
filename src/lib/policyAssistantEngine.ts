import type { KnowledgeArticle } from '../store';
import { EXTRA_POLICY_KNOWLEDGE } from '../data/agencyKnowledgeExtra';

const DISCLAIMER =
  "This answer is based on your agency knowledge base and general industry practice. It is not legal advice or a substitute for the insurer's policy wording or a licensed professional's opinion.";

export function mergeKnowledgeArticles(kb: KnowledgeArticle[]): KnowledgeArticle[] {
  const map = new Map<string, KnowledgeArticle>();
  for (const a of EXTRA_POLICY_KNOWLEDGE) map.set(a.id, a);
  for (const a of kb) map.set(a.id, a);
  return Array.from(map.values());
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9\u0900-\u097F]+/)
    .filter((t) => t.length > 1);
}

function stripMarkdownBold(s: string): string {
  return s.replace(/\*\*/g, '');
}

function excerpt(text: string, max: number): string {
  const t = stripMarkdownBold(text).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function scoreArticle(article: KnowledgeArticle, tokens: string[]): number {
  const hay = `${article.title} ${article.content} ${article.tags ?? ''} ${article.category}`.toLowerCase();
  const faqText = (article.faqs ?? []).map((f) => `${f.q} ${f.a}`).join(' ').toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (hay.includes(t)) score += 2;
    if (faqText.includes(t)) score += 4;
    if (article.title.toLowerCase().includes(t)) score += 5;
  }
  return score;
}

function findFaqAnswer(query: string, article: KnowledgeArticle): string | null {
  const q = query.toLowerCase().trim();
  if (!q || !article.faqs?.length) return null;
  for (const f of article.faqs) {
    const fq = f.q.toLowerCase();
    const prefix = fq.slice(0, Math.min(12, fq.length));
    if (q.includes(prefix)) return f.a;
    const words = tokenize(f.q);
    if (words.some((w) => (w.length > 3 && q.includes(w)))) return f.a;
  }
  return null;
}

export function searchKnowledge(all: KnowledgeArticle[], query: string, limit = 8): KnowledgeArticle[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return all.filter((a) => a.is_published).slice(0, limit);
  }
  const scored = all
    .filter((a) => a.is_published)
    .map((a) => ({ a, s: scoreArticle(a, tokens) }))
    .filter(({ s }) => s > 0)
    .sort((x, y) => y.s - x.s)
    .map(({ a }) => a);
  if (scored.length > 0) return scored.slice(0, limit);
  return all.filter((a) => a.is_published).slice(0, limit);
}

export function buildContextForModel(articles: KnowledgeArticle[], maxChars = 14000): string {
  const parts: string[] = [];
  let n = 0;
  for (const a of articles) {
    const block = `## ${a.title} (${a.category})\n${a.content}\n`;
    if (n + block.length > maxChars) break;
    parts.push(block);
    n += block.length;
    if (a.faqs?.length) {
      const fq = a.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n');
      const fb = `FAQs:\n${fq}\n`;
      if (n + fb.length > maxChars) break;
      parts.push(fb);
      n += fb.length;
    }
  }
  return parts.join('\n');
}

export function buildLocalReply(
  query: string,
  ranked: KnowledgeArticle[],
): { text: string; sources: Array<{ id: string; title: string; category: string }> } {
  if (ranked.length === 0) {
    return {
      text: `I could not find a strong match in the knowledge base. Try different keywords, open **Knowledge Base**, or ask about motor, health, life, claims, IRDAI, or KYC.\n\n_${DISCLAIMER}_`,
      sources: [],
    };
  }

  const top = ranked.slice(0, 3);
  const parts: string[] = [];

  const faqA = findFaqAnswer(query, ranked[0]);
  if (faqA) parts.push(`**Quick answer:** ${faqA}`);

  for (const a of top) {
    parts.push(`**${a.title}** (${a.category})\n${excerpt(a.content, 520)}`);
  }

  return {
    text: `${parts.join('\n\n---\n\n')}\n\n_${DISCLAIMER}_`,
    sources: top.map((a) => ({ id: a.id, title: a.title, category: a.category })),
  };
}

export { DISCLAIMER as policyAssistantDisclaimer };
