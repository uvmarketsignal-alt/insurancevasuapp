import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Users, FileCheck, AlertCircle, BookOpen,
  BarChart3, ShieldCheck, Settings, LogOut, Camera,
  FileText, Home, Clock, DollarSign, Users2, ClipboardList,
  TrendingUp, User, Zap, ArrowRight, Hash
} from 'lucide-react';
import { useStore } from '../store';
import type { Page } from '../types';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  type: 'command' | 'customer' | 'lead' | 'document' | 'article';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  action: () => void;
  keywords: string[];
  roles: Array<'owner' | 'employee'>;
}

interface CommandPaletteProps {
  onClose: () => void;
  onNavigate: (page: Page) => void;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100 rounded px-0.5">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function CommandPalette({ onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'all' | 'commands' | 'customers' | 'leads' | 'documents' | 'articles'>('all');

  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);
  const itemRefs  = useRef<Array<HTMLButtonElement | null>>([]);

  const {
    tenant,
    customers,
    leads,
    documents,
    knowledgeArticles,
    logout,
  } = useStore();

  const activeTenant = tenant;

  // Auto-focus input on open
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // ── BUILD COMMANDS ──────────────────────────────────────────────────────────

  const buildCommands = useCallback((): SearchResult[] => [
    {
      id: 'cmd-dashboard',
      type: 'command',
      title: 'Go to Dashboard',
      subtitle: 'Open the main dashboard',
      icon: <TrendingUp className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate(activeTenant?.role === 'owner' ? 'owner-dashboard' : 'employee-dashboard'); onClose(); },
      keywords: ['dashboard', 'home', 'main', 'overview'],
      roles: ['owner', 'employee'],
    },
    {
      id: 'cmd-customers',
      type: 'command',
      title: 'View Customers',
      subtitle: 'Browse all customer records',
      icon: <Users className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate('customers'); onClose(); },
      keywords: ['customers', 'clients', 'people', 'list'],
      roles: ['owner', 'employee'],
    },
    {
      id: 'cmd-new-customer',
      type: 'command',
      title: 'Add New Customer',
      subtitle: 'Open new customer wizard',
      icon: <User className="w-4 h-4" />,
      badge: 'Action',
      badgeColor: 'bg-green-100 text-green-700',
      action: () => { onNavigate('new-customer'); onClose(); },
      keywords: ['new', 'add', 'create', 'customer', 'register'],
      roles: ['owner', 'employee'],
    },
    {
      id: 'cmd-approvals',
      type: 'command',
      title: 'Customer Approvals',
      subtitle: 'Review pending customer submissions',
      icon: <FileCheck className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate('approvals'); onClose(); },
      keywords: ['approvals', 'pending', 'review', 'approve', 'reject'],
      roles: ['owner'],
    },
    {
      id: 'cmd-claims',
      type: 'command',
      title: 'Manage Claims',
      subtitle: 'View and process insurance claims',
      icon: <AlertCircle className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate('claims'); onClose(); },
      keywords: ['claims', 'complaints', 'issues', 'filed', 'settled'],
      roles: ['owner', 'employee'],
    },
    {
      id: 'cmd-leads',
      type: 'command',
      title: 'View Leads',
      subtitle: 'Manage your sales pipeline',
      icon: <Users2 className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate('leads'); onClose(); },
      keywords: ['leads', 'prospects', 'pipeline', 'sales', 'opportunities'],
      roles: ['owner', 'employee'],
    },
    {
      id: 'cmd-renewals',
      type: 'command',
      title: 'Policy Renewals',
      subtitle: 'Track and manage policy renewals',
      icon: <Clock className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate('renewals'); onClose(); },
      keywords: ['renewals', 'expiring', 'renew', 'expiry', 'due'],
      roles: ['owner', 'employee'],
    },
    {
      id: 'cmd-commissions',
      type: 'command',
      title: 'Commissions',
      subtitle: 'View earnings and commission status',
      icon: <DollarSign className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate('commissions'); onClose(); },
      keywords: ['commissions', 'earnings', 'payouts', 'money', 'salary'],
      roles: ['owner', 'employee'],
    },
    {
      id: 'cmd-employees',
      type: 'command',
      title: 'Manage Employees',
      subtitle: 'View and manage staff accounts',
      icon: <Users2 className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate('employees'); onClose(); },
      keywords: ['employees', 'team', 'staff', 'agents', 'workers'],
      roles: ['owner'],
    },
    {
      id: 'cmd-documents',
      type: 'command',
      title: 'View Documents',
      subtitle: 'Browse uploaded files and documents',
      icon: <FileText className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate('documents'); onClose(); },
      keywords: ['documents', 'files', 'uploads', 'aadhaar', 'pan', 'rc'],
      roles: ['owner', 'employee'],
    },
    {
      id: 'cmd-family',
      type: 'command',
      title: 'Family Tree',
      subtitle: 'Manage customer family members',
      icon: <Home className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate('family-tree'); onClose(); },
      keywords: ['family', 'dependents', 'members', 'relatives', 'spouse'],
      roles: ['owner', 'employee'],
    },
    {
      id: 'cmd-audit',
      type: 'command',
      title: 'Audit Logs',
      subtitle: 'Full activity trail and history',
      icon: <ClipboardList className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate('audit-logs'); onClose(); },
      keywords: ['audit', 'logs', 'history', 'tracking', 'activity'],
      roles: ['owner'],
    },
    {
      id: 'cmd-knowledge',
      type: 'command',
      title: 'Knowledge Base',
      subtitle: 'Policy guides, FAQs and articles',
      icon: <BookOpen className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate('knowledge-base'); onClose(); },
      keywords: ['knowledge', 'articles', 'help', 'docs', 'guide', 'faq'],
      roles: ['owner', 'employee'],
    },
    {
      id: 'cmd-analytics',
      type: 'command',
      title: 'Analytics Dashboard',
      subtitle: 'Business insights and reports',
      icon: <BarChart3 className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate('analytics'); onClose(); },
      keywords: ['analytics', 'reports', 'insights', 'data', 'charts', 'stats'],
      roles: ['owner'],
    },
    {
      id: 'cmd-compliance',
      type: 'command',
      title: 'Compliance Reports',
      subtitle: 'IRDAI regulatory reports',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate('compliance'); onClose(); },
      keywords: ['compliance', 'irdai', 'regulations', 'report', 'legal'],
      roles: ['owner'],
    },
    {
      id: 'cmd-settings',
      type: 'command',
      title: 'Settings',
      subtitle: 'App configuration and preferences',
      icon: <Settings className="w-4 h-4" />,
      badge: 'Nav',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: () => { onNavigate('settings'); onClose(); },
      keywords: ['settings', 'configuration', 'preferences', 'setup', 'config'],
      roles: ['owner'],
    },
    {
      id: 'cmd-profile',
      type: 'command',
      title: 'My Profile',
      subtitle: 'View and edit your profile',
      icon: <User className="w-4 h-4" />,
      badge: 'Action',
      badgeColor: 'bg-green-100 text-green-700',
      action: () => { onNavigate('profile'); onClose(); },
      keywords: ['profile', 'account', 'me', 'personal', 'edit'],
      roles: ['owner', 'employee'],
    },
    {
      id: 'cmd-camera',
      type: 'command',
      title: 'Capture Document',
      subtitle: 'Take photo with webcam',
      icon: <Camera className="w-4 h-4" />,
      badge: 'Action',
      badgeColor: 'bg-green-100 text-green-700',
      action: () => { onNavigate('new-customer'); onClose(); },
      keywords: ['camera', 'capture', 'photo', 'scan', 'webcam'],
      roles: ['owner', 'employee'],
    },
    {
      id: 'cmd-logout',
      type: 'command',
      title: 'Logout',
      subtitle: 'Sign out of your account',
      icon: <LogOut className="w-4 h-4" />,
      badge: 'Action',
      badgeColor: 'bg-red-100 text-red-700',
      action: () => { logout(); onClose(); },
      keywords: ['logout', 'sign out', 'exit', 'bye'],
      roles: ['owner', 'employee'],
    },
  ], [activeTenant, onNavigate, onClose, logout]);

  // ── BUILD DATA RESULTS ──────────────────────────────────────────────────────

  const buildCustomerResults = useCallback((): SearchResult[] => {
    if (!customers?.length) return [];
    return customers
      .filter(c => c.status !== 'deleted')
      .map(c => ({
        id: `cust-${c.id}`,
        type: 'customer' as const,
        title: c.full_name,
        subtitle: `${c.phone}${c.email ? ` · ${c.email}` : ''}`,
        icon: <User className="w-4 h-4" />,
        badge: c.status,
        badgeColor:
          c.status === 'approved'   ? 'bg-green-100 text-green-700' :
          c.status === 'pending'    ? 'bg-yellow-100 text-yellow-700' :
          c.status === 'rejected'   ? 'bg-red-100 text-red-700' :
          'bg-orange-100 text-orange-700',
        action: () => { onNavigate('customers'); onClose(); },
        keywords: [c.full_name, c.phone, c.email ?? '', c.occupation ?? '', c.status],
        roles: ['owner', 'employee'] as Array<'owner' | 'employee'>,
      }));
  }, [customers, onNavigate, onClose]);

  const buildLeadResults = useCallback((): SearchResult[] => {
    if (!leads?.length) return [];
    return leads
      .filter(l => l.status !== 'deleted')
      .map(l => ({
        id: `lead-${l.id}`,
        type: 'lead' as const,
        title: l.full_name,
        subtitle: `${l.phone} · ${l.policy_interest ?? 'unknown'} policy`,
        icon: <Zap className="w-4 h-4" />,
        badge: l.status,
        badgeColor:
          l.status === 'Closed'    ? 'bg-green-100 text-green-700' :
          l.status === 'New'       ? 'bg-blue-100 text-blue-700'   :
          l.status === 'Proposal'  ? 'bg-purple-100 text-purple-700' :
          'bg-yellow-100 text-yellow-700',
        action: () => { onNavigate('leads'); onClose(); },
        keywords: [l.full_name, l.phone, l.email ?? '', l.status, l.source ?? '', l.policy_interest ?? ''],
        roles: ['owner', 'employee'] as Array<'owner' | 'employee'>,
      }));
  }, [leads, onNavigate, onClose]);

  const buildDocumentResults = useCallback((): SearchResult[] => {
    if (!documents?.length) return [];
    return documents.map(d => ({
      id: `doc-${d.id}`,
      type: 'document' as const,
      title: d.file_name,
      subtitle: `${d.document_type} · ${d.is_camera_capture ? '📷 Camera' : '📁 File'}`,
      icon: <FileText className="w-4 h-4" />,
      badge: d.document_type,
      badgeColor: 'bg-gray-100 text-gray-700',
      action: () => { onNavigate('documents'); onClose(); },
      keywords: [d.file_name, d.document_type, d.is_camera_capture ? 'camera' : 'file'],
      roles: ['owner', 'employee'] as Array<'owner' | 'employee'>,
    }));
  }, [documents, onNavigate, onClose]);

  const buildArticleResults = useCallback((): SearchResult[] => {
    if (!knowledgeArticles?.length) return [];
    return knowledgeArticles.map(a => ({
      id: `art-${a.id}`,
      type: 'article' as const,
      title: a.title,
      subtitle: a.category,
      icon: <BookOpen className="w-4 h-4" />,
      badge: a.category,
      badgeColor: 'bg-indigo-100 text-indigo-700',
      action: () => { onNavigate('knowledge-base'); onClose(); },
      keywords: [a.title, a.category, ...(a.tags?.split(',') ?? [])],
      roles: ['owner', 'employee'] as Array<'owner' | 'employee'>,
    }));
  }, [knowledgeArticles, onNavigate, onClose]);

  // ── FILTER & RANK ───────────────────────────────────────────────────────────

  const allResults = useCallback((): SearchResult[] => {
    const role = (activeTenant?.role ?? 'employee') as 'owner' | 'employee';
    return [
      ...buildCommands(),
      ...buildCustomerResults(),
      ...buildLeadResults(),
      ...buildDocumentResults(),
      ...buildArticleResults(),
    ].filter(r => r.roles.includes(role));
  }, [activeTenant, buildCommands, buildCustomerResults, buildLeadResults, buildDocumentResults, buildArticleResults]);

  const filteredResults = useCallback((): SearchResult[] => {
    const q = query.toLowerCase().trim();
    let results = allResults();

    // Category filter
    if (activeCategory !== 'all') {
      const map: Record<string, SearchResult['type']> = {
        commands: 'command',
        customers: 'customer',
        leads: 'lead',
        documents: 'document',
        articles: 'article',
      };
      results = results.filter(r => r.type === map[activeCategory]);
    }

    if (!q) return results.slice(0, 30);

    // Score-based ranking
    const scored = results
      .map(r => {
        let score = 0;
        const titleLow    = r.title.toLowerCase();
        const subtitleLow = (r.subtitle ?? '').toLowerCase();
        const keyLow      = r.keywords.join(' ').toLowerCase();

        if (titleLow === q)                   score += 100;
        if (titleLow.startsWith(q))           score += 80;
        if (titleLow.includes(q))             score += 60;
        if (subtitleLow.includes(q))          score += 40;
        if (keyLow.includes(q))               score += 20;

        return { result: r, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.result);

    return scored.slice(0, 20);
  }, [query, activeCategory, allResults]);

  const results = filteredResults();

  // ── KEYBOARD NAVIGATION ─────────────────────────────────────────────────────

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % Math.max(results.length, 1));
        break;
      default:
        break;
    }
  };

  // ── GROUP RESULTS BY TYPE ───────────────────────────────────────────────────

  type GroupKey = 'Commands' | 'Customers' | 'Leads' | 'Documents' | 'Articles';

  const grouped: Partial<Record<GroupKey, SearchResult[]>> = {};
  const groupOrder: GroupKey[] = ['Commands', 'Customers', 'Leads', 'Documents', 'Articles'];
  const typeToGroup: Record<SearchResult['type'], GroupKey> = {
    command:  'Commands',
    customer: 'Customers',
    lead:     'Leads',
    document: 'Documents',
    article:  'Articles',
  };

  results.forEach(r => {
    const g = typeToGroup[r.type];
    if (!grouped[g]) grouped[g] = [];
    grouped[g]!.push(r);
  });

  // Flat ordered list for keyboard indexing
  const flatList: SearchResult[] = [];
  groupOrder.forEach(g => {
    if (grouped[g]) flatList.push(...grouped[g]!);
  });

  // Count per category
  const counts = {
    all:       allResults().length,
    commands:  allResults().filter(r => r.type === 'command').length,
    customers: allResults().filter(r => r.type === 'customer').length,
    leads:     allResults().filter(r => r.type === 'lead').length,
    documents: allResults().filter(r => r.type === 'document').length,
    articles:  allResults().filter(r => r.type === 'article').length,
  };

  // ── GROUP COLOR ICON ────────────────────────────────────────────────────────
  const groupMeta: Record<GroupKey, { color: string; bgColor: string; icon: React.ReactNode }> = {
    Commands:  { color: 'text-blue-700',   bgColor: 'bg-blue-50',   icon: <Zap className="w-3 h-3" />       },
    Customers: { color: 'text-green-700',  bgColor: 'bg-green-50',  icon: <Users className="w-3 h-3" />     },
    Leads:     { color: 'text-purple-700', bgColor: 'bg-purple-50', icon: <TrendingUp className="w-3 h-3" />},
    Documents: { color: 'text-orange-700', bgColor: 'bg-orange-50', icon: <FileText className="w-3 h-3" />  },
    Articles:  { color: 'text-indigo-700', bgColor: 'bg-indigo-50', icon: <BookOpen className="w-3 h-3" />  },
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-[100] pt-[10vh] px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Search Input ────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search commands, customers, leads, documents..."
              className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-base focus:outline-none"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="hidden sm:flex items-center gap-1 text-xs text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              ESC
            </button>
          </div>

          {/* ── Category Tabs ────────────────────────────────────────────── */}
          <div className="flex gap-1 px-4 py-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
            {(
              [
                { key: 'all',       label: 'All',       count: counts.all },
                { key: 'commands',  label: 'Commands',  count: counts.commands },
                { key: 'customers', label: 'Customers', count: counts.customers },
                { key: 'leads',     label: 'Leads',     count: counts.leads },
                { key: 'documents', label: 'Documents', count: counts.documents },
                { key: 'articles',  label: 'Articles',  count: counts.articles },
              ] as { key: typeof activeCategory; label: string; count: number }[]
            ).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveCategory(tab.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  activeCategory === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeCategory === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* ── Results List ─────────────────────────────────────────────── */}
          <div
            ref={listRef}
            className="max-h-[50vh] overflow-y-auto p-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            {flatList.length === 0 ? (
              <div className="py-12 text-center">
                <Search className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                  {query ? `No results for "${query}"` : 'Start typing to search'}
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                  Search across commands, customers, leads, documents, and articles
                </p>
              </div>
            ) : (
              groupOrder.map(groupName => {
                const groupResults = grouped[groupName];
                if (!groupResults?.length) return null;
                const meta = groupMeta[groupName];

                return (
                  <div key={groupName} className="mb-2">
                    {/* Group header */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${meta.bgColor} mb-1`}>
                      <span className={meta.color}>{meta.icon}</span>
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${meta.color}`}>
                        {groupName}
                      </span>
                      <span className={`ml-auto text-[11px] font-bold ${meta.color} opacity-70`}>
                        {groupResults.length}
                      </span>
                    </div>

                    {/* Group items */}
                    {groupResults.map(result => {
                      const globalIdx = flatList.indexOf(result);
                      const isSelected = globalIdx === selectedIndex;

                      return (
                        <button
                          key={result.id}
                          ref={el => { itemRefs.current[globalIdx] = el; }}
                          onClick={result.action}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-700'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {/* Icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            {result.icon}
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate transition-colors ${
                              isSelected
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}>
                              {highlight(result.title, query)}
                            </p>
                            {result.subtitle && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                {highlight(result.subtitle, query)}
                              </p>
                            )}
                          </div>

                          {/* Badge */}
                          {result.badge && (
                            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${result.badgeColor}`}>
                              {result.badge}
                            </span>
                          )}

                          {/* Arrow (selected) */}
                          {isSelected && (
                            <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 font-mono text-[10px]">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 font-mono text-[10px]">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 font-mono text-[10px]">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 font-mono text-[10px]">ESC</kbd>
                Close
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Hash className="w-3 h-3" />
              <span>{flatList.length} result{flatList.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
