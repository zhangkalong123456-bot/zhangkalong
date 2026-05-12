import { Link } from 'react-router-dom';
import './HomePage.css';

const modules = [
  {
    path: '/timer',
    icon: '⏱',
    title: '辩论计时器',
    desc: '自定义赛制流程，支持多种预设赛制，可视化倒计时',
    color: 'primary',
  },
  {
    path: '/debate',
    icon: '🎙',
    title: '模拟辩论',
    desc: 'AI 模拟对手与队友，支持 1-8 人多种模式',
    color: 'accent',
  },
  {
    path: '/workshop',
    icon: '📋',
    title: '协作工作坊',
    desc: '实时白板、稿件编辑、AI 审稿与论点优化',
    color: 'success',
  },
];

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="home-hero">
        <h1 className="home-title">AI-Debate Master</h1>
        <p className="home-subtitle">智能辩论教练与模拟平台</p>
        <p className="home-desc">集协作备赛、AI模拟实战、自动化计时及多维度反馈于一体</p>
      </div>

      <div className="home-modules">
        {modules.map(m => (
          <Link to={m.path} key={m.path} className={`module-card module-${m.color}`}>
            <span className="module-icon">{m.icon}</span>
            <div className="module-info">
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
            </div>
            <span className="module-arrow">→</span>
          </Link>
        ))}
      </div>

      <div className="home-features">
        <h2>平台特色</h2>
        <div className="feature-grid">
          <div className="feature-item">
            <span className="feature-icon">🤖</span>
            <h4>AI 多角色模拟</h4>
            <p>AI 可模拟对手四辩、队友、三名差异化评委</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <h4>多维度赛后分析</h4>
            <p>选手画像、战场拆解、核心矛盾点分析</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🗣</span>
            <h4>语音模拟</h4>
            <p>TTS 语音合成，模拟真实辩论场景</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📝</span>
            <h4>AI 智能审稿</h4>
            <p>逻辑谬误检测、受敌面分析、金句建议</p>
          </div>
        </div>
      </div>
    </div>
  );
}
