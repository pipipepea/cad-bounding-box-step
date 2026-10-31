import React from 'react';
import { Box, Sparkles, FolderOpen, RefreshCw, Cpu, Layers } from 'lucide-react';

interface HeaderProps {
  modelLoaded: boolean;
  onReset: () => void;
  onLoadSample: () => void;
  onOpenUpload: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  modelLoaded,
  onReset,
  onLoadSample,
  onOpenUpload,
  isLoading,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-lg flex items-center justify-center">
            <Box className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-white tracking-wide">
              CAD Bounding Box Auto-Measure
            </h1>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              AABB + OBB (PCA)
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hidden sm:inline-flex items-center gap-1">
              <Cpu className="w-2.5 h-2.5" /> OCCT WASM Client-Side
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Tự động trích xuất kích thước phủ bì chi tiết STEP (.stp/.step) trực tiếp trên trình duyệt
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {modelLoaded && (
          <button
            onClick={onOpenUpload}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Tải file STEP khác"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Mở file khác</span>
          </button>
        )}

        {!modelLoaded && (
          <button
            onClick={onLoadSample}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 active:bg-emerald-950 border border-emerald-700/50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-950 disabled:opacity-50 cursor-pointer"
            title="Thử nghiệm nhanh với file mẫu .step"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mở file mẫu Demo</span>
          </button>
        )}

        {modelLoaded && (
          <button
            onClick={onReset}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/40"
            title="Đóng mô hình hiện tại"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
