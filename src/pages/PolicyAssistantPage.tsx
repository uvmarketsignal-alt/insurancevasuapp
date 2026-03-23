import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, Sparkles, BookOpen, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import {
  mergeKnowledgeArticles,
  searchKnowledge,
  buildLocalReply,
  buildContextForModel,
} from '../lib/policyAssistantEngine';
import { postChat } from '../lib/api';

type Role = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  sources?: Array<{ id: string; title: string; category: string }>;
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((p, i) => {
    const bold = p.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">{bold[1]}</strong>;
    const em = p.match(/^_(.+)_$/);
    if (em) return <em key={i} className="text-slate-600 dark:text-slate-400">{em[1]}</em>;
    return <span key={i}>{p}</span>;
  });
}

const AI_ENABLED = import.meta.env.VITE_ENABLE_AI_CHAT === 'true';

export default function PolicyAssistantPage() {
  const knowledgeArticles = useStore((s) => s.knowledgeArticles);
  const merged = useMemo(() => mergeKnowledgeArticles(knowledgeArticles), [knowledgeArticles]);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Ask anything about **motor, health, life, travel, home**, **claims**, **IRDAI**, **KYC/AML**, or **renewals**. Answers use your Knowledge Base plus built-in agency policy notes.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [useAi, setUseAi] = useState(AI_ENABLED);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: q };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    const ranked = searchKnowledge(merged, q, 10);
    const local = buildLocalReply(q, ranked);

    let assistantContent = local.text;
    let sources = local.sources;

    if (useAi && AI_ENABLED) {
      const ctx = buildContextForModel(ranked.slice(0, 8));
      const historyForApi = [...messages.filter((m) => m.id !== 'welcome'), userMsg];
      const apiMessages = historyForApi.slice(-12).map((m) => ({ role: m.role, content: m.content }));
      const ai = await postChat({
        messages: apiMessages,
        context: ctx,
      });
      if (ai.reply && ai.mode === 'openai') {
        assistantContent = `${ai.reply}\n\n_— Enhanced with AI (verify against policy wording)._`;
        sources = ranked.slice(0, 5).map((a) => ({ id: a.id, title: a.title, category: a.category }));
      }
    }

    const assistantMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: assistantContent,
      sources,
    };
    setMessages((m) => [...m, assistantMsg]);
    setLoading(false);
  }, [input, loading, merged, messages, useAi]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Bot className="w-8 h-8 text-violet-600" />
          Policy Assistant
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Grounded in your knowledge base and compliance notes. Not a substitute for insurer documents.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col h-[min(72vh,640px)]"
      >
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>{merged.length} articles in context</span>
          </div>
          {AI_ENABLED && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useAi}
                onChange={(e) => setUseAi(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Enhanced AI (server)</span>
            </label>
          )}
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{formatInline(msg.content)}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400">
                    <p className="font-medium mb-1">Sources</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {msg.sources.map((s) => (
                        <li key={s.id}>
                          {s.title}{' '}
                          <span className="text-slate-400">({s.category})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking…
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="e.g. What is IDV? How do I escalate a grievance?"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="px-5 py-3 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
