import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../stores/useAuthStore';

interface Record {
  id: number;
  topic: string;
  format_name: string;
  user_side: string;
  created_at: string;
  scores?: { [key: string]: number };
}

export default function MyRecordsPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    authFetch('/api/records')
      .then(res => {
        if (!res.ok) throw new Error('请求失败');
        return res.json();
      })
      .then(data => setRecords(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.hint}>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <p style={{ ...styles.hint, color: 'var(--primary)' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>我的练习记录</h2>

      {records.length === 0 ? (
        <p style={styles.hint}>暂无练习记录</p>
      ) : (
        <div style={styles.list}>
          {records.map(r => (
            <div
              key={r.id}
              style={styles.card}
              onClick={() => navigate(`/records/${r.id}`)}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
              }}
            >
              <div style={styles.cardHeader}>
                <span style={styles.topic}>{r.topic}</span>
                <span style={styles.date}>
                  {new Date(r.created_at).toLocaleDateString('zh-CN')}
                </span>
              </div>

              <div style={styles.meta}>
                <span style={styles.tag}>{r.format_name}</span>
                <span style={styles.tag}>{r.user_side}</span>
              </div>

              {r.scores && Object.keys(r.scores).length > 0 && (
                <div style={styles.scores}>
                  {Object.entries(r.scores).map(([k, v]) => (
                    <span key={k} style={styles.scoreItem}>
                      {k}: <strong>{v}</strong>
                    </span>
                  ))}
                </div>
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
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  topic: {
    color: 'var(--text-bright)',
    fontWeight: 600,
    fontSize: '1.05rem',
  },
  date: {
    color: 'var(--text-dim)',
    fontSize: '0.85rem',
  },
  meta: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  tag: {
    color: 'var(--text)',
    fontSize: '0.85rem',
    background: 'var(--border)',
    borderRadius: 4,
    padding: '2px 8px',
  },
  scores: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    marginTop: '0.25rem',
  },
  scoreItem: {
    color: 'var(--text-dim)',
    fontSize: '0.85rem',
  },
};
