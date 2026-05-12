import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../stores/useAuthStore';

export default function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch(`/api/records/${id}`).then(async r => {
      if (!r.ok) throw new Error((await r.json()).error);
      return r.json();
    }).then(setRecord).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>加载中...</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;
  if (!record) return null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginBottom: 16, fontFamily: 'var(--font)' }}>
        ← 返回
      </button>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: 4 }}>
        {record.topic}
      </h1>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: 24 }}>
        {record.format_name} · {record.user_side === 'pro' ? '正方' : '反方'} · {record.mode} · {new Date(record.created_at).toLocaleString('zh-CN')}
      </p>

      {/* Verdicts */}
      {record.verdicts && record.verdicts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: 12 }}>评委判决</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {record.verdicts.map((v: any, i: number) => (
              <div key={i} style={{ flex: '1 1 200px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-bright)' }}>{v.judgeName}</div>
                <div style={{ fontSize: '0.85rem', color: v.winner === 'pro' ? 'var(--pro-color)' : 'var(--con-color)' }}>
                  判{v.winner === 'pro' ? '正方' : '反方'}胜 ({v.scores?.pro} : {v.scores?.con})
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 8 }}>{v.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis */}
      {record.analysis && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: 12 }}>赛后分析</h2>

          {record.analysis.clashPoints && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--text-bright)', marginBottom: 8 }}>核心交锋点</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {record.analysis.clashPoints.map((cp: any, i: number) => (
                  <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-bright)', marginBottom: 4 }}>
                      {i + 1}. {cp.topic}
                      <span style={{
                        marginLeft: 8, padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem',
                        background: cp.winner === 'pro' ? 'rgba(91,157,245,0.15)' : cp.winner === 'con' ? 'rgba(245,121,91,0.15)' : 'var(--bg)',
                        color: cp.winner === 'pro' ? 'var(--pro-color)' : cp.winner === 'con' ? 'var(--con-color)' : 'var(--text-dim)',
                      }}>
                        {cp.winner === 'pro' ? '正方占优' : cp.winner === 'con' ? '反方占优' : '持平'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{cp.analysis}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.analysis.overallFeedback && (
            <div style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--primary)', marginBottom: 8 }}>总体评价</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{record.analysis.overallFeedback}</p>
            </div>
          )}

          {record.analysis.playerProfiles && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--text-bright)', marginBottom: 8 }}>选手分析</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {record.analysis.playerProfiles.map((p: any, i: number) => (
                  <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-bright)', marginBottom: 8 }}>{p.player}</div>
                    {p.scores && (
                      <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        <span>逻辑 {p.scores.logic || '-'}</span>
                        <span>表达 {p.scores.expression || '-'}</span>
                        <span>策略 {p.scores.strategy || '-'}</span>
                        <span>证据 {p.scores.evidence || '-'}</span>
                      </div>
                    )}
                    {p.strengths?.length > 0 && (
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>优点：</span>
                        {p.strengths.map((s: string, j: number) => (
                          <span key={j} style={{ display: 'inline-block', marginRight: 8, fontSize: '0.78rem', color: 'var(--text)' }}>· {s}</span>
                        ))}
                      </div>
                    )}
                    {p.weaknesses?.length > 0 && (
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>不足：</span>
                        {p.weaknesses.map((s: string, j: number) => (
                          <span key={j} style={{ display: 'inline-block', marginRight: 8, fontSize: '0.78rem', color: 'var(--text)' }}>· {s}</span>
                        ))}
                      </div>
                    )}
                    {p.improvementPlan?.length > 0 && (
                      <div>
                        <span style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>提升建议：</span>
                        {p.improvementPlan.map((s: string, j: number) => (
                          <span key={j} style={{ display: 'inline-block', marginRight: 8, fontSize: '0.78rem', color: 'var(--text)' }}>{j + 1}. {s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Debate Record */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: 12 }}>辩论记录</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {record.record?.map((r: any, i: number) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 600, color: r.side === '正方' ? 'var(--pro-color)' : 'var(--con-color)', fontSize: '0.9rem' }}>
                {r.speaker}
              </span>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{r.stage}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{r.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
