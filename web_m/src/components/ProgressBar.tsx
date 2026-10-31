import React from 'react';
import { Loader2, XCircle, Cpu } from 'lucide-react';

interface ProgressBarProps {
  step: string;
  percent: number;
  onCancel?: () => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ step, percent, onCancel }) => {
  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 shadow-2xl rounded-2xl p-6 max-w-md w-full text-center relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>

        <h3 className="text-base font-semibold text-slate-100 mb-1">
          Đang xử lý hình học CAD
        </h3>
        <p className="text-xs text-slate-400 mb-5 min-h-[20px] flex items-center justify-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>{step || 'Đang đọc dữ liệu...'}</span>
        </p>

        {/* Progress track */}
        <div className="w-full bg-slate-800 rounded-full h-2.5 mb-2 overflow-hidden border border-slate-700/50 p-[1px]">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full transition-all duration-300 ease-out shadow-sm shadow-cyan-500/50"
            style={{ width: `${Math.max(5, Math.min(100, percent))}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono mb-4 px-1">
          <span>Tiến trình</span>
          <span className="text-cyan-400 font-semibold">{percent}%</span>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center justify-center gap-1 mx-auto transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Hủy xử lý</span>
          </button>
        )}
      </div>
    </div>
  );
};
