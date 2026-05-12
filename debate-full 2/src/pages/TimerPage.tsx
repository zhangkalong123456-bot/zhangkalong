import { useTimerStore } from '../stores/useTimerStore';
import { useTimer } from '../hooks/useTimer';
import { timerPresets } from '../lib/debate-formats';
import TimerDisplay from '../components/common/TimerDisplay';
import ProgressBar from '../components/common/ProgressBar';
import StageEditor from '../components/common/StageEditor';
import './TimerPage.css';

export default function TimerPage() {
  const store = useTimerStore();
  const { currentStage, currentStageIndex, remainingSeconds, running, stages } = useTimer();

  if (store.started) {
    return (
      <div className="timer-run">
        <ProgressBar
          current={currentStageIndex}
          total={stages.length}
          label={`环节 ${currentStageIndex + 1} / ${stages.length}`}
        />

        <div className="timer-stage-info">
          <h2>{currentStage?.name}</h2>
          {currentStage?.speaker && (
            <p className="timer-speaker-label">{currentStage.speaker}</p>
          )}
        </div>

        <TimerDisplay seconds={remainingSeconds} />

        <div className="timer-controls">
          <button className="btn btn-lg" onClick={store.prevStage} disabled={currentStageIndex === 0}>
            ⏮ 上一环节
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => running ? store.pause() : store.resume()}
          >
            {running ? '⏸ 暂停' : '▶ 开始'}
          </button>
          <button className="btn btn-lg" onClick={store.nextStage} disabled={currentStageIndex === stages.length - 1}>
            下一环节 ⏭
          </button>
        </div>

        <button className="btn btn-ghost" onClick={store.stop}>结束计时</button>
      </div>
    );
  }

  return (
    <div className="timer-setup">
      <h1>辩论计时器</h1>
      <p className="timer-desc">选择预设赛制或自定义流程，开始计时</p>

      <div className="timer-preset-row">
        <label>预设赛制：</label>
        <select
          onChange={(e) => store.loadPreset(e.target.value)}
          defaultValue="standard"
          style={{ maxWidth: 300 }}
        >
          <option value="">自定义</option>
          {timerPresets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <StageEditor
        stages={store.stages}
        onUpdate={store.updateStage}
        onRemove={store.removeStage}
        onAdd={store.addStage}
      />

      <div className="timer-start-row">
        <button className="btn btn-primary btn-lg" onClick={store.start}>
          ▶ 开始计时
        </button>
      </div>
    </div>
  );
}
