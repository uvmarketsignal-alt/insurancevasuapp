import type { KnowledgeArticle } from '../store';

/** Static corpus merged with in-app knowledge (IRDAI, process, compliance). */
export const EXTRA_POLICY_KNOWLEDGE: KnowledgeArticle[] = [
  {
    id: 'sys_irdai_agency',
    tenant_id: 'system',
    title: 'IRDAI & Insurance Intermediary Basics (India)',
    content: `**Regulator:** Insurance Regulatory and Development Authority of India (IRDAI) supervises insurers and intermediaries.

**Intermediaries:** Agents (individual/corporate), brokers, web aggregators, and corporate agents must hold valid IRDAI registration and follow code of conduct.

**Key duties:** Fair disclosure of product features, exclusions, and charges; suitability of product; no mis-selling; maintain records; comply with KYC/AML norms.

**POSP (Point of Sale Person):** Can solicit and market specified simple retail products after prescribed training and certification as per IRDAI guidelines.

**Grievance:** Every insurer must have a grievance redressal process; policyholders can escalate to IRDAI’s Bima Bharosa / IGMS if unresolved within timelines.

**Data:** Treat customer data as confidential; follow reasonable security practices.`,
    category: 'Compliance',
    tags: 'irdai,intermediary,posp,grievance,mis-selling,compliance',
    faqs: [
      { q: 'Who regulates insurance in India?', a: 'IRDAI regulates insurers, intermediaries, and market conduct.' },
      { q: 'What is mis-selling?', a: 'Selling unsuitable products, hiding exclusions/charges, or misrepresenting benefits—this is prohibited and may attract penalties.' },
    ],
    view_count: 0,
    is_published: true,
    created_at: new Date('2024-06-01'),
    updated_at: new Date(),
  },
  {
    id: 'sys_kyc_aml',
    tenant_id: 'system',
    title: 'KYC, AML & Customer Due Diligence',
    content: `**KYC:** Collect identity and address proof as per applicable insurer/IRDAI norms (Aadhaar, PAN, etc.) before policy issuance where required.

**AML:** Monitor suspicious patterns (structuring, inconsistent income vs cover, rapid churn). Escalate as per your principal insurer/employer policy.

**PEP & sanctions:** Follow insurer guidance for politically exposed persons and screening requirements.

**Record keeping:** Retain documents and call records as per applicable timelines and audit requirements.`,
    category: 'Compliance',
    tags: 'kyc,aml,pan,aadhaar,due diligence,records',
    view_count: 0,
    is_published: true,
    created_at: new Date('2024-06-02'),
    updated_at: new Date(),
  },
  {
    id: 'sys_claims_process',
    tenant_id: 'system',
    title: 'Claims – General Process & Documentation',
    content: `**Notify:** Inform the insurer as soon as possible (motor/health/travel have specific intimation windows in policy).

**Documents:** Typically FIR (if theft/accident), hospital papers (health), bills, ID proof, policy copy, filled claim form. Exact list is in policy wording.

**Cashless vs reimbursement:** Network hospitals may offer cashless for health; else pay and claim reimbursement with bills.

**Survey:** Property/motor claims may require surveyor inspection—cooperate and provide access.

**Dispute:** Use insurer grievance cell first; then ombudsman / Bima Bharosa routes as applicable.

**Agent role:** Help customer compile documents and track status; do not guarantee claim approval.`,
    category: 'Claims',
    tags: 'claims,intimation,documentation,cashless,reimbursement,ombudsman',
    faqs: [
      { q: 'Does the agent decide claim approval?', a: 'No. The insurer or TPA assesses the claim as per policy terms. The agent assists with process only.' },
    ],
    view_count: 0,
    is_published: true,
    created_at: new Date('2024-06-03'),
    updated_at: new Date(),
  },
  {
    id: 'sys_privacy_consent',
    tenant_id: 'system',
    title: 'Consent, Privacy & Communication',
    content: `**Consent:** Obtain clear consent for collection and use of personal data for insurance solicitation and servicing.

**WhatsApp/SMS:** Use only approved templates where required; honour opt-out requests.

**Cross-sell:** Must be fair; do not bundle unrelated products without disclosure.

**Security:** Do not share OTPs, passwords, or policy details on unsecured channels.`,
    category: 'Compliance',
    tags: 'privacy,consent,whatsapp,dnd,data protection',
    view_count: 0,
    is_published: true,
    created_at: new Date('2024-06-04'),
    updated_at: new Date(),
  },
  {
    id: 'sys_renewal_cooling',
    tenant_id: 'system',
    title: 'Renewal, Free-look & Cooling-off',
    content: `**Renewal:** Pay premium before due date to avoid break in cover; NCB (motor) and waiting periods may reset on lapse.

**Free-look:** Many life policies allow cancellation within a free-look period with refund as per terms.

**Cooling-off:** Rules vary by product—refer to specific policy schedule and insurer circulars.

**Portability:** Health insurance portability may be available—compare continuity benefits and waiting periods.`,
    category: 'Servicing',
    tags: 'renewal,free-look,portability,ncb,lapse',
    view_count: 0,
    is_published: true,
    created_at: new Date('2024-06-05'),
    updated_at: new Date(),
  },
];
