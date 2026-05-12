import { useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import './SettingsPage.css';

export default function SettingsPage() {
  const { apiKey, setApiKey } = useAppStore();
  const [inputKey, setInputKey] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setApiKey(inputKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="settings-page">
      <h1>设置</h1>

      <div className="settings-section">
        <h3>Anthropic API Key</h3>
        <p className="settings-hint">
          模拟辩论和 AI 审稿功能需要 Anthropic API Key。
          你的 Key 仅保存在浏览器本地存储中。
        </p>
        <div className="api-key-row">
          <input
            type="password"
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            placeholder="sk-ant-..."
          />
          <button className="btn btn-primary" onClick={handleSave}>
            保存
          </button>
        </div>
        {saved && <span className="save-status">已保存</span>}
        {apiKey && !saved && <span className="save-status existing">已配置</span>}
      </div>

      <div className="settings-section">
        <h3>关于</h3>
        <p className="settings-hint">
          AI-Debate Master — 智能辩论教练与模拟平台 v1.0.0
        </p>
        <p className="settings-hint">
          集成协作备赛、AI模拟实战、自动化赛制计时及多维度反馈。
        </p>
      </div>
    </div>
  );
}
