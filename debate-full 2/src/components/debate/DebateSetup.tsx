import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { debateFormats, getSideLabel } from '../../lib/debate-formats';
import type { DebateMode } from '../../lib/types';
import { useDebateStore } from '../../stores/useDebateStore';
import './DebateSetup.css';

const modeOptions: { value: DebateMode; label: string; desc: string; isOnline?: boolean }[] = [
  { value: '1v4', label: '1人练习', desc: '你一人对战4名AI对手，AI补齐你的队友' },
  { value: '2v4', label: '2人练习', desc: '2人小队，AI补齐队友并模拟对手' },
  { value: '3v4', label: '3人练习', desc: '3人小队，AI补齐1名队友并模拟对手' },
  { value: '4v4', label: '4人整队', desc: '完整4人一队，AI模拟对手和评委' },
  { value: '4v4-full', label: '8人完整对抗', desc: '两队共8人完整对抗，AI仅模拟评委', isOnline: true },
];

export default function DebateSetup() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [side, setSide] = useState<'pro' | 'con'>('pro');
  const [mode, setMode] = useState<DebateMode>('1v4');
  const [formatId, setFormatId] = useState('standard');
  const [humanPositions, setHumanPositions] = useState<number[]>([1]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showDrafts, setShowDrafts] = useState(false);

  const initSession = useDebateStore(s => s.initSession);

  // Update human positions when mode changes
  function handleModeChange(m: DebateMode) {
    setMode(m);
    if (m === '4v4-full') {
      setHumanPositions([1, 2, 3, 4]); // all 4 positions on user side are human
    } else {
      const count = parseInt(m[0]);
      setHumanPositions(Array.from({ length: count }, (_, i) => i + 1));
    }
  }

  function togglePosition(pos: number) {
    if (mode === '4v4-full') return; // Fixed at all positions in full mode
    const maxHuman = parseInt(mode[0]);
    if (maxHuman === 1) {
      setHumanPositions([pos]);
    } else if (humanPositions.includes(pos)) {
      if (humanPositions.length > 1) {
        setHumanPositions(humanPositions.filter(p => p !== pos));
      }
    } else if (humanPositions.length < maxHuman) {
      setHumanPositions([...humanPositions, pos].sort());
    }
  }

  function handleStart() {
    if (!topic.trim()) { alert('请输入辩题'); return; }

    // For 4v4-full (8 person) mode, navigate to online room
    if (mode === '4v4-full') {
      navigate('/room', { state: { prefillTopic: topic, prefillFormat: formatId } });
      return;
    }

    const format = debateFormats.find(f => f.id === formatId) || debateFormats[0];
    initSession({ topic, format, mode, userSide: side, humanPositions, draftArguments: drafts });
  }

  function togglePosition(pos: number) {
    const maxHuman = parseInt(mode[0]);
    if (maxHuman === 1) {
      // Single player: just switch to the clicked position
      setHumanPositions([pos]);
    } else if (humanPositions.includes(pos)) {
      // Deselect, but keep at least 1
      if (humanPositions.length > 1) {
        setHumanPositions(humanPositions.filter(p => p !== pos));
      }
    } else if (humanPositions.length < maxHuman) {
      setHumanPositions([...humanPositions, pos].sort());
    }
  }

  function handleStart() {
    if (!topic.trim()) { alert('请输入辩题'); return; }
    const format = debateFormats.find(f => f.id === formatId) || debateFormats[0];
    initSession({ topic, format, mode, userSide: side, humanPositions, draftArguments: drafts });
  }

  return (
    <div className="debate-setup">
      <h1>模拟辩论</h1>
      <p className="setup-desc">设置辩题和模式，AI 将模拟对手与你进行完整辩论</p>

      <div className="setup-form">
        <div className="form-group">
          <label>辩题</label>
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="例：人工智能的发展利大于弊 / 弊大于利"
          />
        </div>

        <div className="form-group">
          <label>你的持方</label>
          <div className="side-toggle">
            <button
              className={`btn ${side === 'pro' ? 'btn-active-pro' : ''}`}
              onClick={() => setSide('pro')}
            >
              正方
            </button>
            <button
              className={`btn ${side === 'con' ? 'btn-active-con' : ''}`}
              onClick={() => setSide('con')}
            >
              反方
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>模式</label>
          <div className="mode-grid">
            {modeOptions.map(opt => (
              <button
                key={opt.value}
                className={`mode-card ${mode === opt.value ? 'active' : ''} ${opt.isOnline ? 'mode-card-online' : ''}`}
                onClick={() => handleModeChange(opt.value)}
              >
                <strong>{opt.label}{opt.isOnline ? ' 🌐' : ''}</strong>
                <small>{opt.desc}</small>
              </button>
            ))}
          </div>
        </div>

        {mode !== '4v4-full' ? (
          <>
            <div className="form-group">
              <label>选择你的辩位{parseInt(mode[0]) > 1 ? '（可多选）' : ''}</label>
              <div className="position-selector">
                {[1, 2, 3, 4].map(pos => (
                  <button
                    key={pos}
                    className={`btn position-btn ${humanPositions.includes(pos) ? 'btn-primary' : ''}`}
                    onClick={() => togglePosition(pos)}
                  >
                    {getSideLabel(side)}{['', '一辩', '二辩', '三辩', '四辩'][pos]}
                  </button>
                ))}
              </div>
              <small className="position-hint">
                已选：{humanPositions.map(p => ['', '一辩', '二辩', '三辩', '四辩'][p]).join('、')}，其余辩位由 AI 队友代替
              </small>
            </div>

            <div className="form-group">
              <label>赛制</label>
              <select value={formatId} onChange={e => setFormatId(e.target.value)}>
                {debateFormats.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <button className="btn btn-ghost" onClick={() => setShowDrafts(!showDrafts)}>
                {showDrafts ? '▼ 收起稿件' : '▶ 上传队伍稿件（可选）'}
              </button>
              {showDrafts && (
                <div className="drafts-section">
                  <p className="drafts-hint">
                    上传你方的准备稿件，AI队友将基于这些论点保持一致性
                  </p>
                  <textarea
                    rows={6}
                    placeholder="在这里粘贴你方准备的论点和稿件..."
                    value={drafts[`${side}-all`] || ''}
                    onChange={e => setDrafts({ ...drafts, [`${side}-all`]: e.target.value })}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="online-mode-notice">
            <h3>🌐 在线完整对抗模式</h3>
            <p>此模式需要 <strong>8 位选手</strong>（两队各4人）同时在线完成比赛。</p>
            <p>AI 将仅模拟 <strong>3 位评委</strong>，在比赛结束后给出投票和评判理由。</p>
            <p>点击"创建房间"后将进入在线对战页面，你可以邀请7位队友加入。</p>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label>赛制</label>
              <select value={formatId} onChange={e => setFormatId(e.target.value)}>
                {debateFormats.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <button className="btn btn-accent btn-lg start-btn" onClick={handleStart}>
          {mode === '4v4-full' ? '创建在线房间' : '开始模辩'}
        </button>
      </div>
    </div>
  );
}
