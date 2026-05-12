import { useEffect, useState } from 'react';
import { authFetch } from '../stores/useAuthStore';

interface Draft {
  id: number;
  title: string;
  content: string;
  char_count: number;
  updated_at: string;
}

export default function MyDraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDrafts = () => {
    authFetch('/api/drafts')
      .then(res => {
        if (!res.ok) throw new Error('请求失败');
        return res.json();
      })
      .then(data => setDrafts(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleCreate = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSubmitting(true);
    authFetch('/api/drafts', {
      method: 'POST',
      body: JSON.stringify({ title: newTitle.trim(), content: newContent.trim() }),
    })
      .then(res => {
        if (!res.ok) throw new Error('创建失败');
        return res.json();
      })
      .then(() => {
        setNewTitle('');
        setNewContent('');
        fetchDrafts();
      })
      .catch(err => setError(err.message))
      .finally(() => setSubmitting(false));
  };

  const handleDelete = (id: number) => {
    if (!confirm('确定要删除这篇稿件吗？')) return;
    authFetch(`/api/drafts/${id}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('删除失败');
        setDrafts(prev => prev.filter(d => d.id !== id));
        if (expandedId === id) setExpandedId(null);
      })
      .catch(err => setError(err.message));
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.hint}>加载中...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>我的稿件</h2>

      {error && (
        <p style={{ ...styles.hint, color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>
      )}

      {/* Create form */}
      <div style={styles.form}>
        <input
          style={styles.input}
          placeholder="稿件标题"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
        />
        <textarea
          style={styles.textarea}
          placeholder="稿件内容..."
          rows={4}
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
        />
        <button
          style={{
            ...styles.btn,
            opacity: submitting || !newTitle.trim() || !newContent.trim() ? 0.5 : 1,
          }}
          disabled={submitting || !newTitle.trim() || !newContent.trim()}
          onClick={handleCreate}
        >
          {submitting ? '提交中...' : '新建稿件'}
        </button>
      </div>

      {/* Draft list */}
      {drafts.length === 0 ? (
        <p style={styles.hint}>暂无稿件</p>
      ) : (
        <div style={styles.list}>
          {drafts.map(d => (
            <div key={d.id} style={styles.card}>
              <div
                style={styles.cardHeader}
                onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
              >
                <div>
                  <span style={styles.cardTitle}>{d.title}</span>
                  <span style={styles.meta}>
                    {d.char_count} 字 | {new Date(d.updated_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div style={styles.actions}>
                  <button
                    style={styles.deleteBtn}
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(d.id);
                    }}
                  >
                    删除
                  </button>
                  <span style={styles.arrow}>{expandedId === d.id ? '收起' : '展开'}</span>
                </div>
              </div>

              {expandedId === d.id && (
                <div style={styles.content}>{d.content}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '2rem 1rem',
  },
  title: {
    color: 'var(--text-bright)',
    fontSize: '1.5rem',
    marginBottom: '1.5rem',
  },
  hint: {
    color: 'var(--text-dim)',
    textAlign: 'center',
    marginTop: '4rem',
  },
  form: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '1rem 1.25rem',
    marginBottom: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  input: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '0.5rem 0.75rem',
    color: 'var(--text)',
    fontSize: '1rem',
    outline: 'none',
  },
  textarea: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '0.5rem 0.75rem',
    color: 'var(--text)',
    fontSize: '0.95rem',
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'inherit',
  },
  btn: {
    alignSelf: 'flex-end',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '0.5rem 1.25rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '1rem 1.25rem',
    transition: 'border-color 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    gap: '1rem',
  },
  cardTitle: {
    color: 'var(--text-bright)',
    fontWeight: 600,
    fontSize: '1.05rem',
    marginRight: '0.75rem',
  },
  meta: {
    color: 'var(--text-dim)',
    fontSize: '0.85rem',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexShrink: 0,
  },
  deleteBtn: {
    background: 'transparent',
    color: 'var(--danger)',
    border: '1px solid var(--danger)',
    borderRadius: 4,
    padding: '2px 10px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  arrow: {
    color: 'var(--text-dim)',
    fontSize: '0.8rem',
  },
  content: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: '0.95rem',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  },
};
