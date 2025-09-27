// 播放控制条组件 v0.2

'use client';

import React from 'react';
import { useReplay } from '../lib/context/ReplayContext';
import { SPEED_PRESETS, SEEK_SIZE } from '../lib/config';

const PlaybackControls = () => {
  const { state, setStatus, setIndex, setSpeed, reset } = useReplay();

  const handlePlayPause = () => {
    if (state.status === 'playing') {
      setStatus('paused');
    } else {
      setStatus('playing');
    }
  };

  const handleStop = () => {
    reset();
  };

  const handleStepForward = () => {
    setIndex(state.index + 1);
  };

  const handleStepBack = () => {
    setIndex(state.index - 1);
  };

  const handleSeekForward = () => {
    setIndex(state.index + SEEK_SIZE);
  };

  const handleSeekBack = () => {
    setIndex(state.index - SEEK_SIZE);
  };

  const handleSpeedChange = (speed: number) => {
    setSpeed(speed);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value, 10);
    setIndex(newIndex);
  };


  const currentCandle = state.candles[state.index];
  const progress = state.candles.length > 0 ? (state.index / (state.candles.length - 1)) * 100 : 0;

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-100 rounded-lg">
      {/* 主要控制按钮 */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleStop}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          ■ Stop
        </button>
        <button
          onClick={handlePlayPause}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {state.status === 'playing' ? '⏸️ Pause' : '▶️ Play'}
        </button>
        <button
          onClick={handleStepBack}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ⏮️ Step Back
        </button>
        <button
          onClick={handleStepForward}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ⏭️ Step Forward
        </button>
        <button
          onClick={handleSeekBack}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ⏪ Seek Back
        </button>
        <button
          onClick={handleSeekForward}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ⏩ Seek Forward
        </button>
      </div>

      {/* 速度选择 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Speed:</span>
        {SPEED_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handleSpeedChange(preset.value)}
            className={`px-2 py-1 text-sm rounded ${
              state.speed === preset.value
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* 进度条 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Progress:</span>
        <input
          type="range"
          min="0"
          max={state.candles.length - 1}
          value={state.index}
          onChange={handleProgressChange}
          className="flex-1"
        />
        <span className="text-sm text-gray-600">
          {state.index + 1} / {state.candles.length}
        </span>
      </div>

      {/* 当前信息 */}
      <div className="text-sm text-gray-600">
        Status: {state.status} | Index: {state.index} | Speed: {state.speed}x
        {currentCandle && (
          <>
            | Time: {new Date(Number(currentCandle.time) * 1000).toLocaleString()}
            | Price: {currentCandle.close.toFixed(2)}
          </>
        )}
      </div>

    </div>
  );
};

export default PlaybackControls;