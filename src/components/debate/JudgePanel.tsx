import { useState } from 'react';
import type { JudgeVerdict } from '../../lib/types';
import { useDebateStore } from '../../stores/useDebateStore';
import { getSideLabel } from '../../lib/debate-formats';
import './JudgePanel.css';

const judgeInfo = {
  logic: { name: '逻辑评委', emoji: '🧠', desc: '注重论证严密性' },
  expression: { name: '表达评委', emoji: '🎭', desc: '注重语言感染力' },
  strategy: { name: '战术评委', emoji: '♟', desc: '注重战场把控' },
};

export default function JudgePanel() {
  const session = useDebateStore(s => s.session);
  const verdicts = useDebateStore(s => s.verdicts);
  const setVerdicts = useDebateStore(s => s.setVerdicts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function requestJudging() {
    if (!session) return;
    setLoading(true);
    setError('');

    const types = ['logic', 'expression', 'strategy'] as const;
    const results: JudgeVerdict[] = [];

    try {
      // Call all 3 judges in parallel
      const promises = types.map(async (judgeType) => {
        const res = await fetch('/api/debate/judge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: session.topic,
            judgeType,
            debateRecord: session.record,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        try {
          const parsed = JSON.parse(data.content);
          return {
            judgeId: judgeType,
            judgeName: judgeInfo[judgeType].name,
            scores: parsed.scores,
            winner: parsed.winner,
            reasoning: parsed.reasoning,
            highlights: parsed.highlights || [],
          } as JudgeVerdict;
        } catch {
          return {
            judgeId: judgeType,
            judgeName: judgeInfo[judgeType].name,
            scores: { pro: 50, con: 50 },
            winner: 'pro' as const,
            reasoning: data.content,
            highlights: [],
          } as JudgeVerdict;
        }
      });

      const allVerdicts = await Promise.all(promises);
      setVerdicts(allVerdicts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (verdicts.length === 0) {
    return (
      <div className="judge-panel">
        <h3>评委判决</h3>
        <p className="judge-desc">3名差异化AI评委将对本场辩论进行独立评判</p>
        <div className="judge-avatars">
          {Object.entries(judgeInfo).map(([key, info]) => (
            <div key={key} className="judge-avatar">
              <span className="judge-emoji">{info.emoji}</span>
              <span className="judge-name">{info.name}</span>
              <span className="judge-role">{info.desc}</span>
            </div>
          ))}
        </div>
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
        <button
          className="btn btn-accent btn-lg"
          onClick={requestJudging}
          disabled={loading}
          style={{ alignSelf: 'center' }}
        >
          {loading ? '评委正在审议中...' : '请求评委判决'}
        </button>
      </div>
    );
  }

  // Count votes
  const proVotes = verdicts.filter(v => v.winner === 'pro').length;
  const conVotes = verdicts.filter(v => v.winner === 'con').length;
  const winner = proVotes > conVotes ? 'pro' : 'con';

  return (
    <div className="judge-panel">
      <h3>评委判决结果</h3>

      <div className="verdict-summary">
        <div className={`verdict-winner ${winner === 'pro' ? 'winner-pro' : 'winner-con'}`}>
          {getSideLabel(winner)} 获胜
        </div>
        <div className="verdict-votes">
          投票 {proVotes} : {conVotes}（正方 : 反方）
        </div>
      </div>

      <div className="verdict-cards">
        {verdicts.map(v => {
          const info = judgeInfo[v.judgeId];
          return (
            <div key={v.judgeId} className="verdict-card">
              <div className="verdict-card-header">
                <span>{info.emoji} {v.judgeName}</span>
                <span className={`badge ${v.winner === 'pro' ? 'badge-pro' : 'badge-con'}`}>
                  判{getSideLabel(v.winner)}胜
                </span>
              </div>
              <div className="verdict-scores">
                <span>正方 {v.scores.pro}分</span>
                <span>反方 {v.scores.con}分</span>
              </div>
              <p className="verdict-reasoning">{v.reasoning}</p>
              {v.highlights.length > 0 && (
                <div className="verdict-highlights">
                  <strong>关键胜负手：</strong>
                  <ul>
                    {v.highlights.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
