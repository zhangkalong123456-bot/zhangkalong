import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, authFetch } from '../stores/useAuthStore';

interface StudentStat {
  user_id: number;
  display_name: string;
  practice_count: number;
  last_practice: string | null;
  draft_count: number;
}

interface ClassInfo {
  id: number;
  name: string;
}

interface StudentRecord {
  id: number;
  topic: string;
  format_name: string;
  user_side: string;
  created_at: string;
  scores?: { [key: string]: number };
}

interface StudentDraft {
  id: number;
  topic: string;
  updated_at: string;
  content_preview?: string;
}

export default function TeacherDashboard() {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [statsMap, setStatsMap] = useState<Record<number, StudentStat[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Inline expansion state
  const [expandedRecords, setExpandedRecords] = useState<Record<number, StudentRecord[] | null>>({});
  const [expandedDrafts, setExpandedDrafts] = useState<Record<number, StudentDraft[] | null>>({});
  const [loadingRecords, setLoadingRecords] = useState<Record<number, boolean>>({});
  const [loadingDrafts, setLoadingDrafts] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!user || user.role !== 'teacher') return;

    authFetch('/api/classes')
      .then(res => {
        if (!res.ok) throw new Error('加载班级失败');
        return res.json();
      })
      .then(async (data: ClassInfo[]) => {
        setClasses(data);
        const map: Record<number, StudentStat[]> = {};
        await Promise.all(
          data.map(async c => {
            try {
              const res = await authFetch(`/api/classes/${c.id}/stats`);
              if (res.ok) {
                map[c.id] = await res.json();
              }
            } catch { /* skip */ }
          })
        );
        setStatsMap(map);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || user.role !== 'teacher') {
    return (
      <div style={styles.container}>
        <p style={{ ...styles.hint, color: 'var(--primary)' }}>需要老师权限</p>
      </div>
    );
  }

  const toggleRecords = async (userId: number) => {
    if (expandedRecords[userId] !== undefined) {
      setExpandedRecords(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      return;
    }
    setLoadingRecords(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await authFetch(`/api/records/student/${userId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setExpandedRecords(prev => ({ ...prev, [userId]: data }));
    } catch {
      setExpandedRecords(prev => ({ ...prev, [userId]: [] }));
    } finally {
      setLoadingRecords(prev => ({ ...prev, [userId]: false }));
    }
  };

  const toggleDrafts = async (userId: number) => {
    if (expandedDrafts[userId] !== undefined) {
      setExpandedDrafts(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      return;
    }
    setLoadingDrafts(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await authFetch(`/api/drafts/student/${userId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setExpandedDrafts(prev => ({ ...prev, [userId]: data }));
    } catch {
      setExpandedDrafts(prev => ({ ...prev, [userId]: [] }));
    } finally {
      setLoadingDrafts(prev => ({ ...prev, [userId]: false }));
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('zh-CN');
  };

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
      <h2 style={styles.title}>教师面板</h2>

      {classes.length === 0 ? (
        <p style={styles.hint}>暂无班级</p>
      ) : (
        classes.map(cls => {
          const stats = statsMap[cls.id] || [];
          return (
            <div key={cls.id} style={styles.classSection}>
              <h3 style={styles.className}>{cls.name}</h3>

              {stats.length === 0 ? (
                <p style={styles.hintSmall}>该班级暂无学生数据</p>
              ) : (
                <div style={styles.table}>
                  {/* Header */}
                  <div style={{ ...styles.tableRow, ...styles.tableHeader }}>
                    <span style={{ ...styles.cell, flex: 2 }}>姓名</span>
                    <span style={styles.cell}>练习次数</span>
                    <span style={styles.cell}>最近练习</span>
                    <span style={styles.cell}>草稿数</span>
                    <span style={{ ...styles.cell, flex: 2 }}>操作</span>
                  </div>

                  {stats.map(s => (
                    <div key={s.user_id}>
                      <div
                        style={styles.tableRow}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLDivElement).style.background = 'var(--border)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                        }}
                      >
                        <span style={{ ...styles.cell, flex: 2, color: 'var(--text-bright)', fontWeight: 500 }}>
                          {s.display_name}
                        </span>
                        <span style={{
                          ...styles.cell,
                          color: s.practice_count > 0 ? 'var(--accent)' : 'var(--text-dim)',
                          fontWeight: s.practice_count > 0 ? 600 : 400,
                        }}>
                          {s.practice_count}
                        </span>
                        <span style={{ ...styles.cell, color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                          {formatDate(s.last_practice)}
                        </span>
                        <span style={styles.cell}>{s.draft_count}</span>
                        <span style={{ ...styles.cell, flex: 2, display: 'flex', gap: '0.5rem' }}>
                          <button
                            style={styles.btn}
                            onClick={() => toggleRecords(s.user_id)}
                          >
                            {loadingRecords[s.user_id] ? '...' : expandedRecords[s.user_id] !== undefined ? '收起记录' : '查看记录'}
                          </button>
                          <button
                            style={styles.btn}
                            onClick={() => toggleDrafts(s.user_id)}
                          >
                            {loadingDrafts[s.user_id] ? '...' : expandedDrafts[s.user_id] !== undefined ? '收起草稿' : '查看草稿'}
                          </button>
                        </span>
                      </div>

                      {/* Inline records */}
                      {expandedRecords[s.user_id] !== undefined && (
                        <div style={styles.expandedPanel}>
                          <strong style={{ color: 'var(--text-bright)', fontSize: '0.85rem' }}>练习记录</strong>
                          {expandedRecords[s.user_id]!.length === 0 ? (
                            <p style={styles.hintSmall}>暂无记录</p>
                          ) : (
                            expandedRecords[s.user_id]!.map(r => (
                              <div
                                key={r.id}
                                style={styles.subCard}
                                onClick={() => navigate(`/records/${r.id}`)}
                              >
                                <span style={{ color: 'var(--text-bright)' }}>{r.topic}</span>
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                                  {r.format_name} / {r.user_side} / {formatDate(r.created_at)}
                                </span>
                                {r.scores && Object.keys(r.scores).length > 0 && (
                                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                                    {Object.entries(r.scores).map(([k, v]) => `${k}: ${v}`).join('  ')}
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Inline drafts */}
                      {expandedDrafts[s.user_id] !== undefined && (
                        <div style={styles.expandedPanel}>
                          <strong style={{ color: 'var(--text-bright)', fontSize: '0.85rem' }}>草稿列表</strong>
                          {expandedDrafts[s.user_id]!.length === 0 ? (
                            <p style={styles.hintSmall}>暂无草稿</p>
                          ) : (
                            expandedDrafts[s.user_id]!.map(d => (
                              <div key={d.id} style={styles.subCard}>
                                <span style={{ color: 'var(--text-bright)' }}>{d.topic}</span>
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                                  更新于 {formatDate(d.updated_at)}
                                </span>
                                {d.content_preview && (
                                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                                    {d.content_preview}
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: 900,
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
  hintSmall: {
    color: 'var(--text-dim)',
    fontSize: '0.85rem',
    margin: '0.5rem 0',
  },
  classSection: {
    marginBottom: '2rem',
  },
  className: {
    color: 'var(--accent)',
    fontSize: '1.15rem',
    marginBottom: '0.75rem',
    paddingBottom: '0.4rem',
    borderBottom: '1px solid var(--border)',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    background: 'var(--border)',
    fontWeight: 600,
    fontSize: '0.85rem',
    color: 'var(--text-dim)',
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 1rem',
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.15s',
  },
  cell: {
    flex: 1,
    color: 'var(--text)',
    fontSize: '0.9rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  btn: {
    background: 'none',
    border: '1px solid var(--primary)',
    color: 'var(--primary)',
    borderRadius: 4,
    padding: '2px 10px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  expandedPanel: {
    padding: '0.75rem 1rem 0.75rem 2rem',
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  subCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '0.4rem 0.6rem',
    borderLeft: '2px solid var(--accent)',
    marginLeft: '0.25rem',
    cursor: 'pointer',
  },
};
