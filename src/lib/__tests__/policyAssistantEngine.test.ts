import { describe, expect, it } from 'vitest';
import type { KnowledgeArticle } from '../../store';
import {
  buildContextForModel,
  buildLocalReply,
  mergeKnowledgeArticles,
  policyAssistantDisclaimer,
  searchKnowledge,
} from '../policyAssistantEngine';
import { EXTRA_POLICY_KNOWLEDGE } from '../../data/agencyKnowledgeExtra';

function article(partial: Partial<KnowledgeArticle> & Pick<KnowledgeArticle, 'id' | 'title' | 'content' | 'category' | 'view_count' | 'is_published' | 'created_at' | 'updated_at'>): KnowledgeArticle {
  return partial as KnowledgeArticle;
}

describe('policyAssistantEngine', () => {
  it('mergeKnowledgeArticles should include extra + kb and let kb override by id', () => {
    const custom: KnowledgeArticle[] = [
      article({
        id: EXTRA_POLICY_KNOWLEDGE[0].id,
        tenant_id: 'tenant_001',
        title: 'Custom title override',
        content: 'Custom content override',
        category: 'Compliance',
        view_count: 0,
        is_published: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
        faqs: [{ q: 'Who regulates insurance in India?', a: 'Overridden answer' }],
      }),
    ];

    const merged = mergeKnowledgeArticles(custom);
    const hit = merged.find((a) => a.id === EXTRA_POLICY_KNOWLEDGE[0].id);
    expect(hit?.title).toBe('Custom title override');
    // It should still contain other extras
    expect(merged.some((a) => a.id === EXTRA_POLICY_KNOWLEDGE[1].id)).toBe(true);
  });

  it('searchKnowledge with empty query should return published articles (in order) limited', () => {
    const kb: KnowledgeArticle[] = [
      article({
        id: 'a1',
        tenant_id: 't',
        title: 'Motor',
        content: '...',
        category: 'Claims',
        view_count: 0,
        is_published: true,
        created_at: new Date(),
        updated_at: new Date(),
      }),
      article({
        id: 'a2',
        tenant_id: 't',
        title: 'Unpublished',
        content: '...',
        category: 'Claims',
        view_count: 0,
        is_published: false,
        created_at: new Date(),
        updated_at: new Date(),
      }),
      article({
        id: 'a3',
        tenant_id: 't',
        title: 'KYC',
        content: 'KYC AML',
        category: 'Compliance',
        view_count: 0,
        is_published: true,
        created_at: new Date(),
        updated_at: new Date(),
      }),
    ];

    const res = searchKnowledge(kb, '', 1);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('a1');
  });

  it('searchKnowledge should rank by score and fall back when no score matches', () => {
    const kb: KnowledgeArticle[] = [
      article({
        id: 'b1',
        tenant_id: 't',
        title: 'Claims process',
        content: 'documentation and cashless',
        category: 'Claims',
        view_count: 0,
        is_published: true,
        created_at: new Date(),
        updated_at: new Date(),
      }),
      article({
        id: 'b2',
        tenant_id: 't',
        title: 'KYC',
        content: 'Aadhaar PAN record keeping',
        category: 'Compliance',
        view_count: 0,
        is_published: true,
        created_at: new Date(),
        updated_at: new Date(),
      }),
      article({
        id: 'b3',
        tenant_id: 't',
        title: 'Unrelated',
        content: 'nothing',
        category: 'Other',
        view_count: 0,
        is_published: true,
        created_at: new Date(),
        updated_at: new Date(),
      }),
    ];

    const ranked = searchKnowledge(kb, 'aadhaar', 2);
    expect(ranked[0].id).toBe('b2');
    expect(ranked.some((a) => a.id === 'b2')).toBe(true);

    const fallback = searchKnowledge(kb, 'zzzzqwerty', 2);
    // fallback returns first N published entries in original order
    expect(fallback.map((a) => a.id)).toEqual(['b1', 'b2']);
  });

  it('buildContextForModel should include FAQs and respect maxChars', () => {
    const a1: KnowledgeArticle = article({
      id: 'c1',
      tenant_id: 't',
      title: 'Title 1',
      content: 'Content 1',
      category: 'Compliance',
      view_count: 0,
      is_published: true,
      faqs: [{ q: 'Q1', a: 'A1' }],
      created_at: new Date(),
      updated_at: new Date(),
    });
    const a2: KnowledgeArticle = article({
      id: 'c2',
      tenant_id: 't',
      title: 'Title 2',
      content: 'Content 2',
      category: 'Claims',
      view_count: 0,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const full = buildContextForModel([a1, a2], 10_000);
    expect(full).toContain('## Title 1');
    expect(full).toContain('FAQs:');
    expect(full).toContain('Q: Q1');
    expect(full).toContain('A: A1');
    expect(full).toContain('## Title 2');

    const clipped = buildContextForModel([a1, a2], 60);
    // Should at least include the first header, but likely not the second
    expect(clipped).toContain('## Title 1');

    const none = buildContextForModel([a1, a2], 0);
    expect(none).toBe('');
  });

  it('buildLocalReply should return quick FAQ answer when matching and include disclaimer', () => {
    const longContent = 'word '.repeat(120); // > 520 chars after formatting

    const top: KnowledgeArticle = article({
      id: 'd1',
      tenant_id: 't',
      title: 'IRDAI',
      content: `**Regulator:** something\n\n${longContent}`,
      category: 'Compliance',
      view_count: 0,
      is_published: true,
      faqs: [
        { q: 'Who regulates insurance in India?', a: 'IRDAI regulates insurers and intermediaries.' },
        { q: 'What is mis-selling?', a: 'Mis-selling means selling unsuitable products.' },
      ],
      created_at: new Date(),
      updated_at: new Date(),
    });
    const r2: KnowledgeArticle = article({
      id: 'd2',
      tenant_id: 't',
      title: 'KYC',
      content: 'KYC collect identity and address proof',
      category: 'Compliance',
      view_count: 0,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const r3: KnowledgeArticle = article({
      id: 'd3',
      tenant_id: 't',
      title: 'Claims',
      content: 'Notify insurer, gather documents',
      category: 'Claims',
      view_count: 0,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const out = buildLocalReply('who regulates insurance', [top, r2, r3]);
    expect(out.sources.map((s) => s.id)).toEqual(['d1', 'd2', 'd3']);
    expect(out.text).toContain('**Quick answer:** IRDAI regulates insurers and intermediaries.');
    expect(out.text).toContain('**IRDAI** (Compliance)');
    expect(out.text).toContain('…');
    expect(out.text).toContain(policyAssistantDisclaimer);
  });

  it('buildLocalReply should match FAQ answer using token inclusion (non-prefix match)', () => {
    const top: KnowledgeArticle = article({
      id: 'q1',
      tenant_id: 't',
      title: 'Mis-selling',
      content: 'Some content without the keyword',
      category: 'Compliance',
      view_count: 0,
      is_published: true,
      faqs: [{ q: 'What is mis-selling?', a: 'Mis-selling means selling unsuitable products.' }],
      created_at: new Date(),
      updated_at: new Date(),
    });
    const r2: KnowledgeArticle = article({
      id: 'q2',
      tenant_id: 't',
      title: 'Other',
      content: 'Nothing here',
      category: 'Other',
      view_count: 0,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const r3: KnowledgeArticle = article({
      id: 'q3',
      tenant_id: 't',
      title: 'Third',
      content: 'More',
      category: 'Other',
      view_count: 0,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const out = buildLocalReply('selling', [top, r2, r3]);
    expect(out.text).toContain('**Quick answer:** Mis-selling means selling unsuitable products.');
    expect(out.text).toContain(policyAssistantDisclaimer);
  });

  it('buildLocalReply should not include Quick answer when top article has no FAQs', () => {
    const top: KnowledgeArticle = article({
      id: 'nofa1',
      tenant_id: 't',
      title: 'No FAQ Article',
      content: 'Content only',
      category: 'Other',
      view_count: 0,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const r2: KnowledgeArticle = article({
      id: 'nofa2',
      tenant_id: 't',
      title: 'R2',
      content: 'Content 2',
      category: 'Other',
      view_count: 0,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const r3: KnowledgeArticle = article({
      id: 'nofa3',
      tenant_id: 't',
      title: 'R3',
      content: 'Content 3',
      category: 'Other',
      view_count: 0,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const out = buildLocalReply('any query', [top, r2, r3]);
    expect(out.text).not.toContain('**Quick answer:**');
    expect(out.sources.map((s) => s.id)).toEqual(['nofa1', 'nofa2', 'nofa3']);
  });

  it('buildLocalReply should not include Quick answer when query is empty', () => {
    const top: KnowledgeArticle = article({
      id: 'emptyq1',
      tenant_id: 't',
      title: 'Has FAQs',
      content: 'Content',
      category: 'Other',
      view_count: 0,
      is_published: true,
      faqs: [{ q: 'Any question', a: 'Any answer' }],
      created_at: new Date(),
      updated_at: new Date(),
    });
    const r2: KnowledgeArticle = article({
      id: 'emptyq2',
      tenant_id: 't',
      title: 'R2',
      content: 'R2 content',
      category: 'Other',
      view_count: 0,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const r3: KnowledgeArticle = article({
      id: 'emptyq3',
      tenant_id: 't',
      title: 'R3',
      content: 'R3 content',
      category: 'Other',
      view_count: 0,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const out = buildLocalReply('', [top, r2, r3]);
    expect(out.text).not.toContain('**Quick answer:**');
  });

  it('searchKnowledge should score tokens from FAQ text and from titles', () => {
    const kb: KnowledgeArticle[] = [
      article({
        id: 'e1',
        tenant_id: 't',
        title: 'General',
        content: 'No mention here',
        category: 'Other',
        view_count: 0,
        is_published: true,
        faqs: [{ q: 'Does KYC apply here?', a: 'KYC requirements exist.' }],
        created_at: new Date(),
        updated_at: new Date(),
      }),
      article({
        id: 'e2',
        tenant_id: 't',
        title: 'KYC',
        content: 'Content without exact query',
        category: 'Other',
        view_count: 0,
        is_published: true,
        created_at: new Date(),
        updated_at: new Date(),
      }),
      article({
        id: 'e3',
        tenant_id: 't',
        title: 'Unrelated',
        content: 'Nothing',
        category: 'Other',
        view_count: 0,
        is_published: true,
        created_at: new Date(),
        updated_at: new Date(),
      }),
    ];

    const ranked = searchKnowledge(kb, 'kyc', 2);
    expect(ranked[0].id).toBe('e2'); // title match should beat FAQ-only match
    expect(ranked[1].id).toBe('e1'); // FAQ-only match should still score > 0
  });

  it('buildLocalReply should handle empty ranked input (no match)', () => {
    const out = buildLocalReply('anything', []);
    expect(out.sources).toEqual([]);
    expect(out.text).toContain('I could not find a strong match in the knowledge base.');
    expect(out.text).toContain(policyAssistantDisclaimer);
  });
});

