import type { NextPage } from 'next';
import Head from 'next/head';
import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface Message {
  role: 'user' | 'agent';
  content: string;
}

const EXAMPLE_QUERIES = [
  'How is NVIDIA doing financially?',
  'Compare Apple and Microsoft stock fundamentals.',
  'What is the current P/E ratio of Tesla?',
  'Is Alphabet a good investment right now?',
];

const TypingIndicator: React.FC = () => (
  <div className="msg-row">
    <div className="msg-avatar agent-avatar">🤖</div>
    <div className="msg-bubble agent-bubble">
      <div className="typing-indicator">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  </div>
);

const ChatPage: NextPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId] = useState<string>(() => typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(7));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const sendMessage = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, thread_id: threadId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'agent', content: data.answer }]);
    } catch (err: any) {
      setError(err.message || 'Unknown error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      <Head>
        <title>Finance Research Agent</title>
        <meta name="description" content="AI-powered Prit's Finance Research Agent backed by LangChain + Langgraph + Groq + YahooFinance + Wikipedia + Serper API" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="chat-wrapper">
        {/* ── Header ── */}
        <header className="chat-header">
          <div className="chat-header-logo">📈</div>
          <div>
            <div className="chat-header-title">AI-powered Prit's Finance Research Agent</div>
            <div className="chat-header-subtitle">Powered by LangChain · Langgraph · Groq LLM · YahooFinance · Wikipedia · Serper API</div>
          </div>
          <div className="chat-header-badge">LIVE</div>
        </header>

        {/* ── Messages ── */}
        <main className="chat-messages">
          {messages.length === 0 && !loading && (
            <div className="chat-empty">
              <div className="chat-empty-icon">💹</div>
              <div className="chat-empty-title">Ask me anything about stocks &amp; finance</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                I can look up stock fundamentals, compare companies, analyze trends, and more.
              </p>
              <div className="chat-empty-examples">
                {EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    className="chat-example-chip"
                    onClick={() => sendMessage(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              <div className="msg-row user" key={i}>
                <div className="msg-avatar user-avatar">U</div>
                <div className="msg-bubble user-bubble">{msg.content}</div>
              </div>
            ) : (
              <div className="msg-row" key={i}>
                <div className="msg-avatar agent-avatar">🤖</div>
                <div className="msg-bubble agent-bubble">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            )
          )}

          {loading && <TypingIndicator />}

          {error && (
            <div
              className="alert alert-danger d-flex align-items-center gap-2"
              style={{ borderRadius: 12, fontSize: '0.85rem' }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* ── Input ── */}
        <div className="chat-input-area">
          <div className="chat-input-row">
            <textarea
              ref={textareaRef}
              className="chat-input"
              rows={1}
              placeholder="Ask about a stock, company, or market trend…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="chat-send-btn"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  />
                  Thinking…
                </>
              ) : (
                <>Send ↑</>
              )}
            </button>
          </div>
          <p className="chat-input-hint">
            Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for newline
          </p>
        </div>
      </div>
    </>
  );
};

export default ChatPage;
