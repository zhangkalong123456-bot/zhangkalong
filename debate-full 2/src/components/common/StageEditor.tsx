import type { TimerStage } from '../../lib/types';
import './StageEditor.css';

interface Props {
  stages: TimerStage[];
  onUpdate: (index: number, field: keyof TimerStage, value: string | number) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

export default function StageEditor({ stages, onUpdate, onRemove, onAdd }: Props) {
  return (
    <div className="stage-editor">
      <div className="stage-list">
        {stages.map((stage, i) => (
          <div key={i} className="stage-row">
            <span className="stage-num">{i + 1}.</span>
            <input
              className="stage-name"
              value={stage.name}
              placeholder="环节名称"
              onChange={(e) => onUpdate(i, 'name', e.target.value)}
            />
            <input
              className="stage-speaker"
              value={stage.speaker}
              placeholder="发言方"
              onChange={(e) => onUpdate(i, 'speaker', e.target.value)}
            />
            <input
              className="stage-time"
              type="number"
              value={stage.time}
              min={1}
              onChange={(e) => onUpdate(i, 'time', parseInt(e.target.value) || 0)}
            />
            <span className="stage-unit">秒</span>
            <button className="btn btn-danger btn-sm" onClick={() => onRemove(i)}>✕</button>
          </div>
        ))}
      </div>
      <button className="btn" onClick={onAdd}>+ 添加环节</button>
    </div>
  );
}
