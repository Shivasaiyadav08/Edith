import { useState } from 'react';
import Markdown from 'react-markdown';
import type { ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  FileImage,
  FileText,
  ListTodo,
  MessageCircle,
  Plus,
  Receipt,
  Send,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { Spinner } from './ui';
import ResourceForm from './ResourceForm';
import { useWorkspace } from '../lib/workspace-context';
import { errorMessage } from '../lib/api';
import { money } from '../lib/types';
import type { DraftTask, DraftExpense } from '../lib/types';
import { demoMutate } from '../lib/demo';
type Mode = 'plan' | 'receipt' | 'capture' | 'ask';
const modes = [
  { id: 'plan', icon: ListTodo, label: 'Plan a project' },
  { id: 'receipt', icon: Receipt, label: 'Scan a document' },
  { id: 'capture', icon: Wallet, label: 'Quick expense' },
  { id: 'ask', icon: MessageCircle, label: 'Ask your workspace' },
] as const;
export default function AssistantPanel({
  initialMode = 'ask',
  initialPrompt = '',
}: {
  initialMode?: string;
  initialPrompt?: string;
}) {
  const { data, demo, request, refresh, notify, workspace, config, prefix } = useWorkspace();
  const initial = initialMode;
  const [mode, setMode] = useState<Mode>(
    modes.some((m) => m.id === initial) ? (initial as Mode) : 'plan',
  );
  const [prompt, setPrompt] = useState(initialPrompt),
    [image, setImage] = useState(''),
    [filename, setFilename] = useState('');
  const [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [summary, setSummary] = useState(''),
    [tasks, setTasks] = useState<DraftTask[]>([]),
    [expense, setExpense] = useState<DraftExpense | null>(null),
    [answer, setAnswer] = useState(''),
    [sources, setSources] = useState<{ label: string; path: string }[]>([]),
    [project, setProject] = useState('');
  async function chooseImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const mime = file.name.toLowerCase().endsWith('.pdf')
      ? 'application/pdf'
      : file.name.toLowerCase().endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : file.type;
    const document = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(mime);
    if (
      (!document && !['image/png', 'image/jpeg', 'image/webp'].includes(mime)) ||
      file.size > (document ? 5 : 4) * 1024 * 1024
    ) {
      setError(
        'Choose PNG/JPEG/WebP up to 4 MB or PDF/Word (.docx) up to 5 MB. Convert old .doc files to PDF or .docx.',
      );
      e.target.value = '';
      return;
    }
    setError('');
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => setImage(`data:${mime};base64,${String(reader.result).split(',')[1]}`);
    reader.onerror = () => setError('This image could not be read. Try another file.');
    reader.readAsDataURL(file);
  }
  async function generate() {
    setBusy(true);
    setError('');
    setTasks([]);
    setAnswer('');
    setSummary('');
    setSources([]);
    try {
      if (demo) {
        if (mode === 'plan') {
          setSummary(
            'Sample plan — a demonstration of the draft review workflow. Live AI adapts this to your brief.',
          );
          setTasks([
            {
              title: 'Clarify the brief and success criteria',
              description: 'Agree on the audience, scope, deliverables, and budget.',
              priority: 'high',
            },
            {
              title: 'Explore directions and gather references',
              description: 'Collect inspiration and propose a focused direction.',
              priority: 'medium',
            },
            {
              title: 'Build and review the first version',
              description: 'Create a first pass and gather feedback from the team.',
              priority: 'high',
            },
            {
              title: 'Refine, test, and prepare for launch',
              description: 'Resolve feedback, check the details, and agree on the handoff.',
              priority: 'medium',
            },
          ]);
        } else if (mode === 'ask') {
          setAnswer(
            `**Sample workspace summary** (calculated from your demo data):\n\n${data?.projects.length || 0} projects, ${data?.stats.totalTasks || 0} tasks, and ${data?.stats.completedTasks || 0} completed tasks.\n\nRecorded spending: ${money(data?.stats.totalSpentMinor || 0, workspace?.currency)}. Total project budgets: ${money(data?.stats.totalBudgetMinor || 0, workspace?.currency)}.\n\nThis demo shows the response layout. Connect an account and enable AI for answers to your specific questions.`,
          );
          setSources([
            { label: 'Project budgets', path: '/projects' },
            { label: 'Expense records', path: '/expenses' },
          ]);
        } else
          setExpense({
            title: mode === 'receipt' ? 'Sample software receipt' : 'Sample project expense',
            amount: 49,
            currency: workspace?.currency || 'USD',
            category: 'Software',
            merchant: 'Sample merchant',
            date: new Date().toISOString().slice(0, 10),
            notes:
              'Sample draft for demonstration only. This is not extracted from your image or text.',
          });
      } else if (mode === 'plan') {
        const result = await request<{ summary: string; tasks: DraftTask[] }>('/ai/plan', {
          prompt,
        });
        setSummary(result.summary);
        setTasks(result.tasks);
      } else if (mode === 'ask') {
        const result = await request<{
          text: string;
          sources: { label: string; path: string }[];
        }>('/ai/ask', { prompt });
        setAnswer(result.text);
        setSources(result.sources);
      } else
        setExpense(
          await request<DraftExpense>(
            `/ai/${mode}`,
            mode === 'receipt' ? { file: image } : { prompt },
          ),
        );
      if (!demo) await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function saveTasks() {
    setSaving(true);
    setError('');
    try {
      const prepared = tasks.map((t) => ({ ...t, project: project || null }));
      if (demo) for (const task of prepared) demoMutate('tasks', task);
      else await request('/tasks/batch', { tasks: prepared });
      await refresh().catch(() => {});
      setTasks([]);
      setSummary('');
      notify(`${prepared.length} reviewed tasks added to your workspace.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      {demo ? (
        <div className="form-alert info">
          Demo mode uses clearly labeled sample outputs. Create an account and connect AI for real
          planning, receipt extraction, and workspace answers.
        </div>
      ) : (
        !config.ai && (
          <div className="form-alert info">
            Ultron is waiting for a Gemini API key. Add GEMINI_API_KEY from Google AI Studio to the
            backend .env and restart the server. Your core workspace is ready to use.
          </div>
        )
      )}
      <div className="assistant-layout">
        <div className="assistant-input-panel">
          <div className="assistant-mode-tabs" role="tablist" aria-label="Assistant mode">
            {modes.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={mode === m.id}
                className={mode === m.id ? 'active' : ''}
                disabled={busy}
                onClick={() => {
                  setMode(m.id);
                  setTasks([]);
                  setAnswer('');
                  setSummary('');
                  setError('');
                  setPrompt('');
                }}
              >
                <m.icon size={17} />
                {m.label}
              </button>
            ))}
          </div>
          <div className="assistant-input-content">
            <span className="ai-icon large">
              <Sparkles size={25} />
            </span>
            <h2>
              {mode === 'plan'
                ? 'What are you bringing to life?'
                : mode === 'receipt'
                  ? 'Let’s read the little details.'
                  : mode === 'capture'
                    ? 'Tell us what you spent.'
                    : 'What’s on your mind?'}
            </h2>
            <p>
              {mode === 'plan'
                ? 'Describe your project, audience, and deliverables. We’ll suggest a practical starting point.'
                : mode === 'receipt'
                  ? 'Upload a receipt, PDF invoice, or Word document. Review the expense draft before saving.'
                  : mode === 'capture'
                    ? 'Write it naturally. We’ll turn the details into an expense draft.'
                    : 'Ask about your budgets, project progress, or what needs attention.'}
            </p>
            {mode === 'receipt' ? (
              <div className="receipt-upload">
                {image ? (
                  <div className="receipt-image-preview">
                    {image.startsWith('data:image/') ? (
                      <img src={image} alt="Your receipt, ready for extraction" />
                    ) : (
                      <FileText size={32} />
                    )}
                    <span>{filename}</span>
                    <button
                      className="icon-button"
                      aria-label="Remove receipt"
                      onClick={() => {
                        setImage('');
                        setFilename('');
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="upload-zone">
                    <FileImage size={30} />
                    <strong>Choose a receipt or document</strong>
                    <span>Images up to 4 MB · PDF / Word (.docx) up to 5 MB</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx"
                      onChange={(e) => void chooseImage(e)}
                    />
                  </label>
                )}
                <p className="input-hint">
                  PDF and images are sent to Gemini; Word text is extracted first (20,000 characters
                  max). Only reviewed expense fields are saved. Original files are not retained.
                </p>
              </div>
            ) : (
              <>
                <label className="sr-only" htmlFor="ai-prompt">
                  Your request
                </label>
                <textarea
                  id="ai-prompt"
                  className="assistant-prompt"
                  maxLength={mode === 'ask' ? 2000 : 3000}
                  rows={6}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === 'plan'
                      ? 'I’m creating a brand identity for a local coffee shop. We need a logo, packaging, and a simple brand guide...'
                      : mode === 'capture'
                        ? `Spent 49 ${workspace.currency} on Figma today for our brand identity project.`
                        : 'Which projects are over budget, and what needs attention?'
                  }
                />
                <div className="prompt-suggestions">
                  {(mode === 'plan'
                    ? ['Launch a client website', 'Plan a brand refresh']
                    : mode === 'capture'
                      ? [
                          `Hosting renewal, 120 ${workspace.currency} today`,
                          `Team lunch, 86 ${workspace.currency} yesterday`,
                        ]
                      : ['Summarize my workspace', 'Which projects are over budget?']
                  ).map((t) => (
                    <button key={t} onClick={() => setPrompt(t)}>
                      {t}
                      <Plus size={12} />
                    </button>
                  ))}
                </div>
              </>
            )}
            {error && (
              <div className="form-alert error" role="alert">
                {error}
              </div>
            )}
            <button
              className="button button-dark generate-button"
              disabled={
                busy ||
                (!demo && !config.ai) ||
                (mode === 'receipt' ? !image : prompt.trim().length < (mode === 'plan' ? 10 : 5))
              }
              onClick={() => void generate()}
            >
              {busy ? (
                <>
                  <Spinner />
                  Thinking through the details…
                </>
              ) : (
                <>
                  {demo
                    ? 'Preview sample result'
                    : mode === 'plan'
                      ? 'Create a task draft'
                      : mode === 'receipt'
                        ? 'Extract expense draft'
                        : mode === 'capture'
                          ? 'Create expense draft'
                          : 'Ask Ultron'}
                  <Send size={15} />
                </>
              )}
            </button>
            <span className="assistant-safety">
              <Check size={13} /> You review. You decide. Nothing changes automatically.
            </span>
          </div>
        </div>
        <aside className="assistant-output-panel">
          {tasks.length ? (
            <>
              <div className="draft-heading">
                <span className="badge green">
                  <Check size={12} /> Ready to review
                </span>
                <span>{tasks.length} task drafts</span>
              </div>
              <h2>Your next steps, taking shape.</h2>
              <p className="muted">{summary}</p>
              <div className="draft-task-list">
                {tasks.map((t, i) => (
                  <div className="draft-task" key={i}>
                    <span>{i + 1}</span>
                    <div>
                      <input
                        aria-label={`Draft task ${i + 1} title`}
                        value={t.title}
                        maxLength={200}
                        onChange={(e) =>
                          setTasks(
                            tasks.map((task, j) =>
                              i === j ? { ...task, title: e.target.value } : task,
                            ),
                          )
                        }
                      />
                      <textarea
                        aria-label={`Draft task ${i + 1} description`}
                        value={t.description}
                        maxLength={2000}
                        onChange={(e) =>
                          setTasks(
                            tasks.map((task, j) =>
                              i === j ? { ...task, description: e.target.value } : task,
                            ),
                          )
                        }
                      />
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`Remove draft task ${i + 1}`}
                      onClick={() => setTasks(tasks.filter((_, j) => i !== j))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <label>
                Add to project
                <select value={project} onChange={(e) => setProject(e.target.value)}>
                  <option value="">No project</option>
                  {data?.projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button button-dark"
                disabled={saving || tasks.some((t) => !t.title.trim())}
                onClick={() => void saveTasks()}
              >
                {saving ? (
                  <Spinner />
                ) : (
                  <>
                    <Check size={15} />
                    Add reviewed tasks
                  </>
                )}
              </button>
            </>
          ) : answer ? (
            <>
              <span className="badge green">
                <Sparkles size={12} /> {demo ? 'Sample summary' : 'Workspace answer'}
              </span>
              <h2>A little more clarity.</h2>
              <div className="assistant-answer">
                <Markdown>{answer}</Markdown>
              </div>
              <div className="answer-sources">
                {sources.map((s) => (
                  <Link to={`${prefix}${s.path}`} key={s.path}>
                    {s.label}
                    <ArrowRight size={13} />
                  </Link>
                ))}
              </div>
              <p className="input-hint">
                AI answers may be incomplete. Check the linked records before making decisions.
                Totals come from the server.
              </p>
            </>
          ) : (
            <div className="assistant-idle">
              <div className="assistant-idle-art" aria-hidden="true">
                ✳
              </div>
              <span className="eyebrow">A LITTLE POSSIBILITY</span>
              <h3>
                Start with a thought.
                <br />
                We’ll help with the next step.
              </h3>
              <p>Your editable draft or workspace answer will appear here.</p>
              <span>
                <Sparkles size={14} /> Made to assist your judgment.
              </span>
            </div>
          )}
        </aside>
      </div>
      {expense && (
        <ResourceForm resource="expenses" draft={expense} onClose={() => setExpense(null)} />
      )}
    </>
  );
}
