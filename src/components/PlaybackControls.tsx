// 播放控制条组件 v0.4 - compact dark toolbar with popover menus
// 功能：起点选择菜单、速度菜单、周期菜单、步进/快进、顶端可拖动进度条

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReplay } from '../lib/context/ReplayContext';
import { SEEK_SIZE, SUPPORTED_INTERVALS, SUPPORTED_RANGES } from '../lib/config';

interface PlaybackControlsProps {
  onChangeInterval?: (interval: typeof SUPPORTED_INTERVALS[number]) => void;
  onChangeRange?: (range: string) => void;
  currentRange?: string;
  onStartSelect?: () => void;
  selecting?: boolean;
  onReset?: () => void;
  onFocusIndex?: (index: number) => void;
  onEnableCrop?: () => void;
  onFitContent?: () => void;
}

/* ======================= Icons ======================= */

const IconCandle = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <rect x="9" y="5" width="6" height="14" rx="1.5" />
    <path d="M12 2v3M12 19v3" />
  </svg>
);

const IconSeekBack = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path d="M11 6l-7 6 7 6V6z" />
    <path d="M20 6l-7 6 7 6V6z" />
  </svg>
);

const IconSeekFwd = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path d="M4 6l7 6-7 6V6z" />
    <path d="M13 6l7 6-7 6V6z" />
  </svg>
);

const IconStepBack = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path d="M19 6l-8 6 8 6V6z" />
    <path d="M5 6v12" />
  </svg>
);

const IconStepFwd = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path d="M5 6l8 6-8 6V6z" />
    <path d="M19 6v12" />
  </svg>
);

const IconPlay = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M8 5v14l11-7-11-7z" />
  </svg>
);

const IconPause = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="6" y="5" width="4" height="14" rx="1"></rect>
    <rect x="14" y="5" width="4" height="14" rx="1"></rect>
  </svg>
);

const IconReset = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4" />
    <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
  </svg>
);

const IconFit = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path d="M21 21l-4.35-4.35" />
    <circle cx="11" cy="11" r="8" />
    <path d="M19 11h-6" />
  </svg>
);

const btnBase =
  'h-8 px-2 grid place-items-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition';

/* ======================= Helpers ======================= */

const zhInterval = (intv: typeof SUPPORTED_INTERVALS[number]) =>
  intv === '5m' ? '5分钟' : intv === '1h' ? '1小时' : intv === '1wk' ? '1周' : '1天';

const zhRange = (range: string) =>
  range === '1d' ? '1天' :
  range === '5d' ? '5天' :
  range === '30d' ? '30天' :
  range === '60d' ? '60天' :
  range === '120d' ? '120天' :
  range === '3mo' ? '3个月' :
  range === '6mo' ? '6个月' :
  range === '1y' ? '1年' :
  range === '2y' ? '2年' :
  range === '3y' ? '3年' :
  range === '5y' ? '5年' : range;

const toUnixSeconds = (input: number | string): number => {
  if (typeof input === 'number') return input > 1e12 ? Math.floor(input / 1000) : input;
  return Math.floor(Date.parse(input) / 1000);
};

const findClosestIndexByUnixSec = (candles: { time: number | string }[], targetSec: number) => {
  let closest = 0;
  let minDiff = Infinity;
  for (let i = 0; i < candles.length; i++) {
    const sec = toUnixSeconds(candles[i].time);
    const diff = Math.abs(sec - targetSec);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  }
  return closest;
};

const humanizeSpeedNote = (s: number) => {
  if (s >= 1) return `每1秒更新${Math.round(s)}次`;
  const seconds = Math.round((1 / s) * 10) / 10;
  return `每${seconds}秒更新1次`;
};

/* ======================= Component ======================= */

const PlaybackControls = ({ onChangeInterval, onChangeRange, currentRange, onStartSelect, selecting, onReset, onFocusIndex, onEnableCrop, onFitContent }: PlaybackControlsProps) => {
  const { state, setStatus, setIndex, setSpeed, reset } = useReplay();

  const [openStart, setOpenStart] = useState(false);
  const [openSpeed, setOpenSpeed] = useState(false);
  const [openInterval, setOpenInterval] = useState(false);
  const [openRange, setOpenRange] = useState(false);

  const startRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);

  // 速度选项（匹配演示图范围）
  const speedOptions = useMemo(() => [10, 7, 5, 3, 1, 0.5, 0.3, 0.2, 0.1], []);

  // 点击外部，关闭弹层
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (openStart && startRef.current && !startRef.current.contains(t)) setOpenStart(false);
      if (openSpeed && speedRef.current && !speedRef.current.contains(t)) setOpenSpeed(false);
      if (openInterval && intervalRef.current && !intervalRef.current.contains(t)) setOpenInterval(false);
      if (openRange && rangeRef.current && !rangeRef.current.contains(t)) setOpenRange(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openStart, openSpeed, openInterval, openRange]);

  const isPlaying = state.status === 'playing';
  const progress = state.candles.length > 1 ? (state.index / (state.candles.length - 1)) * 100 : 0;
  const hasData = state.candles.length > 0;
  const atStart = state.index <= 0;
  const atEnd = state.index >= Math.max(0, state.candles.length - 1);

  // 控制器
  const handlePlayPause = () => setStatus(isPlaying ? 'paused' : 'playing');
  const handleStepForward = () => {
    if (isPlaying) setStatus('paused');
    setIndex(state.index + 1);
  };
  const handleStepBack = () => {
    if (isPlaying) setStatus('paused');
    setIndex(state.index - 1);
  };
  const handleSeekForward = () => {
    if (isPlaying) setStatus('paused');
    setIndex(state.index + SEEK_SIZE);
  };
  const handleSeekBack = () => {
    if (isPlaying) setStatus('paused');
    setIndex(state.index - SEEK_SIZE);
  };
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPlaying) setStatus('paused');
    setIndex(parseInt(e.target.value, 10));
  };

  // 起点菜单动作
  const pickByDate = () => {
    const input = window.prompt('输入日期（YYYY-MM-DD 或 YYYY/MM/DD）:');
    if (!input) return;
    const ms = Date.parse(input);
    if (Number.isNaN(ms)) {
      alert('无法解析日期');
      return;
    }
    const idx = findClosestIndexByUnixSec(state.candles, Math.floor(ms / 1000));
    // 选择起点：暂停 -> 开启裁剪（隐藏后续K线）-> 设置索引 -> 定位 -> 关闭菜单
    setStatus('paused');
    onEnableCrop?.();
    setIndex(idx);
    onFocusIndex?.(idx);
    setOpenStart(false);
    console.info('[PlaybackControls] Pick by date -> index', idx);
  };

  const pickFirst = () => {
    // 选择第一个起点：暂停 -> 开启裁剪 -> 置 index=0 -> 定位 -> 关闭菜单
    setStatus('paused');
    onEnableCrop?.();
    setIndex(0);
    onFocusIndex?.(0);
    setOpenStart(false);
    console.info('[PlaybackControls] Pick first index -> 0');
  };
  const pickRandom = () => {
    if (!hasData) return;
    const idx = Math.floor(Math.random() * state.candles.length);
    // 随机选择：暂停 -> 开启裁剪 -> 设置索引 -> 定位 -> 关闭菜单
    setStatus('paused');
    onEnableCrop?.();
    setIndex(idx);
    onFocusIndex?.(idx);
    setOpenStart(false);
    console.info('[PlaybackControls] Pick random index ->', idx);
  };

  // 周期切换
  const handleIntervalChange = (intv: typeof SUPPORTED_INTERVALS[number]) => {
    if (onChangeInterval) onChangeInterval(intv);
    setOpenInterval(false);
  };

  // 范围切换
  const handleRangeChange = (range: string) => {
    if (onChangeRange) onChangeRange(range);
    setOpenRange(false);
  };

  return (
    <div className="w-full bg-slate-800/90 text-slate-300 border-t border-slate-700 select-none">
      {/* 顶部细进度条 + 可拖动 */}
      <div className="relative">
        <div className="h-0.5 bg-slate-800" />
        <div className="absolute left-0 top-0 h-0.5 bg-blue-500" style={{ width: `${progress}%` }} />
        <input
          type="range"
          min={0}
          max={Math.max(0, state.candles.length - 1)}
          value={state.index}
          onChange={handleProgressChange}
          aria-label="Scrub playback"
          className="absolute inset-0 w-full h-4 opacity-0 cursor-pointer"
        />
      </div>

      {/* 工具条 */}
      <div className="flex items-center gap-1 px-2 py-2">
        {/* 起点选择（菜单） */}
        <div className="relative" ref={startRef}>
          <button
            onClick={() => setOpenStart(v => !v)}
            title="选择起点"
            aria-haspopup="menu"
            aria-expanded={openStart}
            className={`${btnBase} ${selecting ? 'text-blue-400' : ''}`}
            aria-pressed={!!selecting}
            disabled={!hasData}
          >
            <IconCandle />
          </button>
          {openStart && (
            <div
              role="menu"
              className="absolute z-20 bottom-full mb-2 w-48 rounded-md border border-slate-800 bg-slate-900/98 shadow-lg ring-1 ring-black/5 overflow-hidden"
            >
              <div className="px-3 py-2 text-xs text-slate-400">回放计时</div>
              <button
                role="menuitem"
                onClick={() => {
                  onStartSelect?.();
                  setOpenStart(false);
                  setTimeout(() => console.info('提示：点击图表以选择起点K线'), 0);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-800/70"
                aria-pressed={!!selecting}
              >
                选择K线{selecting ? '（选择中）' : ''}
              </button>
              <button role="menuitem" onClick={pickByDate} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-800/70">
                选择日期...
              </button>
              <button role="menuitem" onClick={pickFirst} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-800/70">
                选择第一个可用日期
              </button>
              <button role="menuitem" onClick={pickRandom} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-800/70">
                随机K线
              </button>
            </div>
          )}
        </div>

        {/* 暂停 */}
        <button
          onClick={handlePlayPause}
          title={isPlaying ? '暂停' : '播放'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={`${btnBase} ${isPlaying ? 'text-blue-400' : ''}`}
          disabled={!hasData}
        >
          {isPlaying ? <IconPause /> : <IconPlay />}
        </button>

        {/* 速度（菜单） */}
        <div className="relative" ref={speedRef}>
          <button
            onClick={() => setOpenSpeed(v => !v)}
            title="速度"
            aria-haspopup="menu"
            aria-expanded={openSpeed}
            className="h-8 px-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/80 text-sm font-medium"
            disabled={!hasData}
          >
            {state.speed}x
          </button>
          {openSpeed && (
            <div
              role="menu"
              className="absolute z-20 bottom-full mb-2 w-56 rounded-md border border-slate-800 bg-slate-900/98 shadow-lg ring-1 ring-black/5 overflow-hidden"
            >
              <div className="px-3 py-2 text-xs text-slate-400">回放速度</div>
              {speedOptions.map(s => {
                const selected = s === state.speed;
                return (
                  <button
                    key={s}
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => {
                      setSpeed(s);
                      setOpenSpeed(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-800/70 ${
                      selected ? 'text-white' : ''
                    }`}
                  >
                    <span>{s}x</span>
                    <span className="text-xs text-slate-400">{humanizeSpeedNote(s)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 周期（菜单） */}
        {onChangeInterval && (
          <div className="relative" ref={intervalRef}>
            <button
              onClick={() => setOpenInterval(v => !v)}
              title="周期"
              aria-haspopup="menu"
              aria-expanded={openInterval}
              className="h-8 px-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/80 text-sm font-medium"
            >
              {zhInterval(state.interval)}
            </button>
            {openInterval && (
              <div
                role="menu"
                className="absolute z-20 bottom-full mb-2 w-40 rounded-md border border-slate-800 bg-slate-900/98 shadow-lg ring-1 ring-black/5 overflow-hidden"
              >
                <div className="px-3 py-2 text-xs text-slate-400">更新周期</div>
                {SUPPORTED_INTERVALS.map(intv => {
                  const selected = intv === state.interval;
                  return (
                    <button
                      key={intv}
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => handleIntervalChange(intv)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-800/70 ${selected ? 'text-white' : ''}`}
                    >
                      {zhInterval(intv)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 时间范围（菜单） */}
        {onChangeRange && currentRange && (
          <div className="relative" ref={rangeRef}>
            <button
              onClick={() => setOpenRange(v => !v)}
              title="时间范围"
              aria-haspopup="menu"
              aria-expanded={openRange}
              className="h-8 px-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/80 text-sm font-medium"
            >
              {zhRange(currentRange)}
            </button>
            {openRange && (
              <div
                role="menu"
                className="absolute z-20 bottom-full mb-2 w-32 rounded-md border border-slate-800 bg-slate-900/98 shadow-lg ring-1 ring-black/5 overflow-hidden"
              >
                <div className="px-3 py-2 text-xs text-slate-400">时间范围</div>
                {SUPPORTED_RANGES[state.interval].map(range => {
                  const selected = range === currentRange;
                  return (
                    <button
                      key={range}
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => handleRangeChange(range)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-800/70 ${selected ? 'text-white' : ''}`}
                    >
                      {zhRange(range)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 分隔 */}
        <div className="mx-1 h-4 w-px bg-slate-800" />

        {/* 单步/区间导航 */}
        <button onClick={handleStepBack} title="上一个" className={btnBase} disabled={!hasData || atStart} aria-label="Step Back">
          <IconStepBack />
        </button>
        <button onClick={handleSeekBack} title="快退" className={btnBase} disabled={!hasData || atStart} aria-label="Seek Back">
          <IconSeekBack />
        </button>
        <button onClick={handleSeekForward} title="快进" className={btnBase} disabled={!hasData || atEnd} aria-label="Seek Forward">
          <IconSeekFwd />
        </button>
        <button onClick={handleStepForward} title="下一个" className={btnBase} disabled={!hasData || atEnd} aria-label="Step Forward">
          <IconStepFwd />
        </button>

        <div className="mx-1 h-4 w-px bg-slate-800" />

        <button onClick={onFitContent} title="适配" className={btnBase} disabled={!hasData} aria-label="Fit Content">
          <IconFit />
        </button>

        <button onClick={onReset} title="重置" className={btnBase} disabled={!hasData} aria-label="Reset">
          <IconReset />
        </button>

        <div className="ml-auto text-xs text-slate-400 tabular-nums">
          {Math.min(state.index + 1, state.candles.length)} / {state.candles.length}
        </div>
      </div>
    </div>
  );
};

export default PlaybackControls;