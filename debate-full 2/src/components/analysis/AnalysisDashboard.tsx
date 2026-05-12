import { useState, useEffect, useRef } from 'react';
import { useDebateStore } from '../../stores/useDebateStore';
import { authFetch } from '../../stores/useAuthStore';
import { getSideLabel } from '../../lib/debate-formats';
import JudgePanel from '../debate/JudgePanel';
import './AnalysisDashboard.css';

export default function AnalysisDashboard() {
  const session = useDebateStore(s => s.session);
  const savedRecordId = useDebateStore(s => s.savedRecordId);
  const [analysisText, setAnalysisText] = useState('');
  const [playerAnalysis, setPlayerAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'judge' | 'analysis' | 'player'>('judge');
  const savedAnalysisRef = useRef(false);
  const savedPlayerRef = useRef(false);

  async function saveAnalysisToRecord(analysisJson: any) {
    if (!savedRecordId || savedAnalysisRef.current) return;
    savedAnalysisRef.current = true;
    try {
      await authFetch(`/api/records/${savedRecordId}/analysis`, {
        method: 'POST',
        body: JSON.stringify({ analysisJson }),
      });
    } catch { }
  }

  async function loadAnalysis() {
    if (!session || analysisText) return;
    setLoading(true);
    try {
      const res = await fetch('/api/debate/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: session.topic,
          userSide: getSideLabel(session.userSide),
          debateRecord: session.record,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      try {
        const parsed = JSON.parse(data.content);
        let text = '';
        if (parsed.clashPoints) {
          text += '【核心交锋点分析】\n\n';
          parsed.clashPoints.forEach((cp: any, i: number) => {
            text += `${i + 1}. ${cp.topic}\n`;
            text += `   正方：${cp.proArgument}\n`;
            text += `   反方：${cp.conArgument}\n`;
            text += `   优势方：${cp.winner === 'pro' ? '正方' : cp.winner === 'con' ? '反方' : '持平'}\n`;
            text += `   分析：${cp.analysis}\n\n`;
          });
        }
        if (parsed.overallFeedback) {
          text += '【总体评价】\n\n' + parsed.overallFeedback;
        }
        setAnalysisText(text || data.content);
        saveAnalysisToRecord(parsed);
      } catch {
        setAnalysisText(data.content);
      }
    } catch (err: any) {
      setAnalysisText(`分析出错: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadPlayerAnalysis() {
    if (!session || playerAnalysis) return;
    setLoading(true);
    try {
      const humanPlayers = session.players.filter(p => p.type === 'human');
      let text = '';
      const allProfiles: any[] = [];

      for (const player of humanPlayers) {
        const res = await fetch('/api/debate/analyze-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: session.topic,
            playerName: player.name,
            side: getSideLabel(player.side),
            debateRecord: session.record,
          }),
        });
        const data = await res.json();
        if (data.error) continue;

        try {
          const parsed = JSON.parse(data.content);
          allProfiles.push({ player: player.name, ...parsed });
          text += `【${player.name}】\n\n`;
          text += `评分：逻辑 ${parsed.scores?.logic || '-'} | 表达 ${parsed.scores?.expression || '-'} | 策略 ${parsed.scores?.strategy || '-'} | 证据 ${parsed.scores?.evidence || '-'}\n\n`;
          if (parsed.strengths?.length) {
            text += '优点：\n' + parsed.strengths.map((s: string) => `  · ${s}`).join('\n') + '\n\n';
          }
          if (parsed.weaknesses?.length) {
            text += '不足：\n' + parsed.weaknesses.map((s: string) => `  · ${s}`).join('\n') + '\n\n';
          }
          if (parsed.improvementPlan?.length) {
            text += '提升建议：\n' + parsed.improvementPlan.map((s: string, i: number) => `  ${i + 1}. ${s}`).join('\n') + '\n\n';
          }
          text += '---\n\n';
        } catch {
          text += `【${player.name}】\n${data.content}\n\n---\n\n`;
        }
      }
      setPlayerAnalysis(text || '暂无选手分析数据');

      if (allProfiles.length > 0 && !savedPlayerRef.current) {
        savedPlayerRef.current = true;
        try {
          await authFetch(`/api/records/${savedRecordId}/analysis`, {
            method: 'POST',
            body: JSON.stringify({ analysisJson: { playerProfiles: allProfiles } }),
          });
        } catch { }
      }
    } catch (err: any) {
      setPlayerAnalysis(`分析出错: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'analysis' && !analysisText) loadAnalysis();
    if (activeTab === 'player' && !playerAnalysis) loadPlayerAnalysis();
  }, [activeTab]);

  if (!session) return null;

  return (
    <div className="analysis-dashboard">
      <h2>赛后分析</h2>
      <p className="analysis-topic">辩题：{session.topic}</p>

      <div className="analysis-tabs">
        <button
          className={`tab-btn ${activeTab === 'judge' ? 'active' : ''}`}
          onClick={() => setActiveTab('judge')}
        >
          评委判决
        </button>
        <button
          className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          战场拆解
        </button>
        <button
          className={`tab-btn ${activeTab === 'player' ? 'active' : ''}`}
          onClick={() => setActiveTab('player')}
        >
          选手画像
        </button>
      </div>

      <div className="analysis-content">
        {activeTab === 'judge' && <JudgePanel />}

        {activeTab === 'analysis' && (
          <div className="analysis-text-panel">
            {loading ? (
              <div className="animate-pulse" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
                正在分析战场...
              </div>
            ) : (
              <pre className="analysis-pre">{analysisText}</pre>
            )}
          </div>
        )}

        {activeTab === 'player' && (
          <div className="analysis-text-panel">
            {loading ? (
              <div className="animate-pulse" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
                正在分析选手表现...
              </div>
            ) : (
              <pre className="analysis-pre">{playerAnalysis}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
