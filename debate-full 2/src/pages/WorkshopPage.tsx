import { useState, useCallback, useEffect, useRef } from 'react';
import { useWorkshopStore } from '../stores/useWorkshopStore';
import { useAuthStore, authFetch } from '../stores/useAuthStore';
import WhiteboardCanvas from '../components/whiteboard/WhiteboardCanvas';
import './WorkshopPage.css';

type ReviewType = 'fallacy' | 'vulnerability' | 'suggestion';

export default function WorkshopPage() {
  const { user } = useAuthStore();
  const {
    documentContent, setDocumentContent,
    reviewResult, setReviewResult,
    reviewLoading, setReviewLoading,
    activeTab, setActiveTab,
    draftId, setDraftId,
    workflowStatus, setWorkflowStatus,
    savedDrafts, setSavedDrafts,
  } = useWorkshopStore();

  const [whiteboardRoomId] = useState(() => `wb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
  const [elementCount, setElementCount] = useState(0);
  const [saveMsg, setSaveMsg] = useState('');
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const loadedRef = useRef(false);

  // Load saved drafts on mount
  useEffect(() => {
    if (!loadedRef.current && user) {
      loadedRef.current = true;
      loadDrafts();
    }
  }, [user]);

  async function loadDrafts() {
    setDraftsLoading(true);
    try {
      const res = await authFetch('/api/drafts');
      const data = await res.json();
      if (Array.isArray(data)) setSavedDrafts(data);
    } catch { }
    setDraftsLoading(false);
  }

  // Save current document as draft
  async function saveAsDraft() {
    if (!documentContent.trim()) {
      setSaveMsg('请先输入稿件内容');
      return;
    }
    setSaveMsg('');
    try {
      const body: any = { title: documentContent.slice(0, 50) || '未命名稿件', content: documentContent };
      if (draftId) body.id = draftId;

      const res = await authFetch('/api/drafts', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setDraftId(data.id);
        setWorkflowStatus('draft');
        setSaveMsg('稿件已保存');
        loadDrafts();
      } else {
        setSaveMsg(data.error || '保存失败');
      }
    } catch (e: any) {
      setSaveMsg(e.message);
    }
  }

  // Load a draft into editor
  async function loadDraft(id: number) {
    try {
      const res = await authFetch(`/api/drafts/${id}`);
      const data = await res.json();
      if (res.ok) {
        setDocumentContent(data.content || '');
        setDraftId(data.id);
        setWorkflowStatus(data.review_json ? 'ai_reviewed' : 'draft');
        setSelectedDraftId(data.id.toString());
      }
    } catch { }
  }

  // Submit for teacher review
  async function submitForReview() {
    if (!draftId) {
      setSaveMsg('请先保存稿件');
      return;
    }
    setWorkflowStatus('teacher_reviewing');
    setSaveMsg('已提交给老师润色');
  }

  // AI polish and finalize
  async function finalizeWithAI() {
    if (!documentContent.trim()) return;
    setReviewLoading(true);
    setReviewResult('');
    setActiveTab('review');

    try {
      const res = await fetch('/api/workshop/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: documentContent, type: 'suggestion' }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let text = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                text += parsed.text;
                setReviewResult(text);
              }
            } catch { }
          }
        }
      }

      setWorkflowStatus('final');
      if (draftId) {
        await authFetch('/api/drafts', {
          method: 'POST',
          body: JSON.stringify({ id: draftId, content: documentContent, reviewJson: { aiPolish: text } }),
        });
      }
      setSaveMsg('AI润色完成，终稿已保存');
    } catch (err: any) {
      setReviewResult(`审核出错: ${err.message}`);
    } finally {
      setReviewLoading(false);
    }
  }

  const requestReview = useCallback(async (type: ReviewType) => {
    if (!documentContent.trim()) {
      alert('请先在编辑器中输入稿件内容');
      return;
    }
    setReviewLoading(true);
    setReviewResult('');

    try {
      const res = await fetch('/api/workshop/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: documentContent, type }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let text = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                text += parsed.text;
                setReviewResult(text);
              }
            } catch { }
          }
        }
      }
    } catch (err: any) {
      setReviewResult(`审核出错: ${err.message}`);
    } finally {
      setReviewLoading(false);
    }
  }, [documentContent, setReviewLoading, setReviewResult]);

  const workflowLabels: Record<string, string> = {
    'draft': '草稿',
    'teacher_reviewing': '老师润色中',
    'ai_reviewed': 'AI已审阅',
    'final': '终稿',
  };

  return (
    <div className="workshop-page">
      <h1>协作工作坊</h1>
      <p className="workshop-desc">白板协作、稿件编辑与 AI 智能审稿</p>

      <div className="workshop-tabs">
        <button
          className={`tab-btn ${activeTab === 'whiteboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('whiteboard')}
        >
          实时白板{elementCount > 0 ? ` (${elementCount})` : ''}
        </button>
        <button
          className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          稿件编辑{workflowStatus ? ` · ${workflowLabels[workflowStatus]}` : ''}
        </button>
        <button
          className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          AI 审稿
        </button>
      </div>

      <div className="workshop-content">
        {activeTab === 'whiteboard' && (
          <div className="whiteboard-container">
            <div className="whiteboard-tools-row">
              <div className="template-tools">
                <span className="tools-label">模板：</span>
                <button className="btn btn-sm" onClick={() => {
                  const template = '【现状分析】\n当前状况是什么？\n\n【需求分析】\n存在什么问题/需求？\n\n【方案分析】\n提出的解决方案是什么？\n\n【损益分析】\n方案的利弊分别是什么？';
                  navigator.clipboard.writeText(template).then(() => alert('模板已复制，请粘贴到白板中'));
                }}>
                  现状/需求/解决/损益
                </button>
                <button className="btn btn-sm" onClick={() => {
                  const template = '【我方核心论点】\n1. \n2. \n3. \n\n【对方可能论点】\n1. \n2. \n3. \n\n【预期交锋点】\n1. \n2. ';
                  navigator.clipboard.writeText(template).then(() => alert('模板已复制，请粘贴到白板中'));
                }}>
                  攻防对比模板
                </button>
              </div>
              <span className="room-id-hint">协作码：{whiteboardRoomId.slice(0, 8)}</span>
            </div>
            <WhiteboardCanvas
              roomId={whiteboardRoomId}
              userName={user?.displayName || user?.username || '匿名'}
              onElementsChange={setElementCount}
            />
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="editor-container">
            {/* Workflow progress */}
            <div className="workflow-bar">
              {['draft', 'teacher_reviewing', 'ai_reviewed', 'final'].map((status, i) => (
                <div key={status} className={`workflow-step ${workflowStatus === status ? 'active' : ''} ${['draft', 'teacher_reviewing', 'ai_reviewed', 'final'].indexOf(workflowStatus) >= i ? 'completed' : ''}`}>
                  <span className="workflow-dot">{i < ['draft', 'teacher_reviewing', 'ai_reviewed', 'final'].indexOf(workflowStatus) ? '✓' : i + 1}</span>
                  <span className="workflow-step-label">{workflowLabels[status]}</span>
                </div>
              ))}
            </div>

            <textarea
              className="document-editor"
              value={documentContent}
              onChange={e => setDocumentContent(e.target.value)}
              placeholder="在这里撰写你的辩论稿件..."
              rows={20}
            />
            <div className="editor-actions">
              <div className="editor-stats">
                字数：{documentContent.length} | 段落：{documentContent.split('\n').filter(l => l.trim()).length}
              </div>
              <div className="editor-buttons">
                {selectedDraftId && (
                  <select
                    className="draft-select"
                    value={selectedDraftId}
                    onChange={e => { setSelectedDraftId(e.target.value); loadDraft(parseInt(e.target.value)); }}
                  >
                    <option value="">加载稿件...</option>
                    {savedDrafts.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.title || `稿件 #${d.id}`}</option>
                    ))}
                  </select>
                )}
                <button className="btn btn-sm" onClick={loadDrafts} disabled={draftsLoading}>
                  刷新列表
                </button>
                <button className="btn btn-sm btn-primary" onClick={saveAsDraft}>
                  保存稿件
                </button>
                {draftId && workflowStatus === 'draft' && user?.role === 'student' && (
                  <button className="btn btn-sm btn-accent" onClick={submitForReview}>
                    提交老师润色
                  </button>
                )}
                {draftId && user?.role === 'teacher' && (
                  <button className="btn btn-sm btn-accent" onClick={() => {
                    setWorkflowStatus('teacher_reviewing');
                    setSaveMsg('老师已标记为润色完成');
                  }}>
                    标记润色完成
                  </button>
                )}
                {(workflowStatus === 'teacher_reviewing' || workflowStatus === 'draft') && (
                  <button className="btn btn-sm" onClick={finalizeWithAI}>
                    AI查漏补缺 → 终稿
                  </button>
                )}
              </div>
            </div>
            {saveMsg && <p className="save-msg">{saveMsg}</p>}
          </div>
        )}

        {activeTab === 'review' && (
          <div className="review-container">
            <div className="review-actions">
              <button
                className="btn btn-primary"
                onClick={() => requestReview('fallacy')}
                disabled={reviewLoading}
              >
                逻辑检测
              </button>
              <button
                className="btn btn-accent"
                onClick={() => requestReview('vulnerability')}
                disabled={reviewLoading}
              >
                受敌面分析
              </button>
              <button
                className="btn"
                onClick={() => requestReview('suggestion')}
                disabled={reviewLoading}
              >
                金句建议
              </button>
            </div>
            {!documentContent.trim() && (
              <p className="review-hint">请先在「稿件编辑」标签中输入内容</p>
            )}
            {reviewLoading && (
              <div className="animate-pulse" style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)' }}>
                AI 正在审核中...
              </div>
            )}
            {reviewResult && (
              <div className="review-result">
                <pre className="review-text">{reviewResult}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
