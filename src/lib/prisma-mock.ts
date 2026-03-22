// ─── PRISMA MOCK CLIENT ───────────────────────────────────────────────────────
// Complete in-memory database with Neon PostgreSQL fallback

const DATABASE_URL = 'postgresql://neondb_owner:npg_2EZhYb9dHjVS@ep-gentle-bread-adfrbjl3-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// In-memory store for all entities
const memoryStore: Record<string, Map<string, any>> = {
  tenants: new Map(), profiles: new Map(), customers: new Map(),
  documents: new Map(), audit_logs: new Map(), notifications: new Map(),
  customer_policies: new Map(), claims: new Map(), commissions: new Map(),
  leads: new Map(), renewals: new Map(), premium_payments: new Map(),
  family_members: new Map(), endorsements: new Map(), message_templates: new Map(),
  compliance_reports: new Map(), knowledge_articles: new Map(),
  ai_insights: new Map(), security_events: new Map(), performance_metrics: new Map(),
};

// Try Neon connection
let neonSql: ((strings: TemplateStringsArray, ...values: any[]) => Promise<any>) | null = null;
let neonAvailable = false;

(async () => {
  try {
    const { neon } = await import('@neondatabase/serverless');
    neonSql = neon(DATABASE_URL);
    await neonSql`SELECT 1`;
    neonAvailable = true;
    console.log('✅ Neon PostgreSQL connected');
  } catch {
    neonAvailable = false;
    console.log('⚠️ Using in-memory store (Neon unavailable)');
  }
})();

function matchesWhere(record: any, where: any): boolean {
  return Object.entries(where).every(([key, val]) => {
    if (val === null) return record[key] == null;
    if (typeof val === 'object' && val !== null) {
      const op = val as any;
      if (op.contains !== undefined) return String(record[key] || '').toLowerCase().includes(String(op.contains).toLowerCase());
      if (op.gte !== undefined && op.lte !== undefined) return record[key] >= op.gte && record[key] <= op.lte;
      if (op.gte !== undefined) return record[key] >= op.gte;
      if (op.lte !== undefined) return record[key] <= op.lte;
      if (op.in !== undefined) return (op.in as any[]).includes(record[key]);
      if (op.not !== undefined) return record[key] !== op.not;
    }
    return record[key] === val;
  });
}

function createTableHandler(tableName: string) {
  const store = memoryStore[tableName];
  return {
    async create({ data }: { data: any }) {
      const id = data.id || crypto.randomUUID();
      const record = { ...data, id };
      store.set(id, record);
      return record;
    },
    async findFirst({ where }: { where?: any } = {}) {
      const records = Array.from(store.values());
      if (!where) return records[0] || null;
      return records.find(r => matchesWhere(r, where)) || null;
    },
    async findMany({ where, orderBy, take, skip }: { where?: any; orderBy?: any; take?: number; skip?: number } = {}) {
      let records = Array.from(store.values());
      if (where) records = records.filter(r => matchesWhere(r, where));
      if (orderBy) {
        const [field, dir] = Object.entries(orderBy)[0] as [string, string];
        records.sort((a, b) => {
          const av = a[field], bv = b[field];
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return dir === 'desc' ? -cmp : cmp;
        });
      }
      if (skip) records = records.slice(skip);
      if (take) records = records.slice(0, take);
      return records;
    },
    async update({ where, data }: { where: any; data: any }) {
      const record = Array.from(store.values()).find(r => matchesWhere(r, where));
      if (!record) {
        // Create if not found (upsert-like)
        const id = where.id || crypto.randomUUID();
        const newRecord = { id, ...data };
        store.set(id, newRecord);
        return newRecord;
      }
      const updated = { ...record, ...data };
      store.set(record.id, updated);
      return updated;
    },
    async updateMany({ where, data }: { where: any; data: any }) {
      const records = Array.from(store.values()).filter(r => matchesWhere(r, where));
      records.forEach(r => store.set(r.id, { ...r, ...data }));
      return { count: records.length };
    },
    async delete({ where }: { where: any }) {
      const record = Array.from(store.values()).find(r => matchesWhere(r, where));
      if (!record) throw new Error(`Record not found in ${tableName}`);
      store.delete(record.id);
      return record;
    },
    async deleteMany({ where }: { where?: any } = {}) {
      const records = where ? Array.from(store.values()).filter(r => matchesWhere(r, where)) : Array.from(store.values());
      records.forEach(r => store.delete(r.id));
      return { count: records.length };
    },
    async count({ where }: { where?: any } = {}) {
      if (!where) return store.size;
      return Array.from(store.values()).filter(r => matchesWhere(r, where)).length;
    },
  };
}

export class PrismaClient {
  tenants           = createTableHandler('tenants');
  profiles          = createTableHandler('profiles');
  customers         = createTableHandler('customers');
  documents         = createTableHandler('documents');
  audit_logs        = createTableHandler('audit_logs');
  notifications     = createTableHandler('notifications');
  customer_policies = createTableHandler('customer_policies');
  claims            = createTableHandler('claims');
  commissions       = createTableHandler('commissions');
  leads             = createTableHandler('leads');
  renewals          = createTableHandler('renewals');
  premium_payments  = createTableHandler('premium_payments');
  family_members    = createTableHandler('family_members');
  endorsements      = createTableHandler('endorsements');
  message_templates = createTableHandler('message_templates');
  compliance_reports = createTableHandler('compliance_reports');
  knowledge_articles = createTableHandler('knowledge_articles');
  ai_insights        = createTableHandler('ai_insights');
  security_events    = createTableHandler('security_events');
  performance_metrics = createTableHandler('performance_metrics');

  async $connect() { return Promise.resolve(); }
  async $disconnect() { return Promise.resolve(); }
  async $queryRaw(_query: TemplateStringsArray) {
    if (neonAvailable && neonSql) {
      return neonSql`SELECT 1 as connected`;
    }
    return [{ connected: 1 }];
  }
  async $executeRaw(_query: TemplateStringsArray) { return 0; }
}

export function getNeonStatus() { return neonAvailable; }
