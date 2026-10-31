import React from 'react';
import { Box, Sparkles, FolderOpen, RefreshCw, Cpu, Sliders } from 'lucide-react';

interface HeaderProps {
  modelLoaded: boolean;
  onReset: () => void;
  onLoadSample: () => void;
  onOpenUpload: () => void;
  isLoading: boolean;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  modelLoaded,
  onReset,
  onLoadSample,
  onOpenUpload,
  isLoading,
  onToggleSidebar,
  sidebarOpen,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0">
          <div className="w-full h-full bg-slate-950 rounded-lg flex items-center justify-center">
            <Box className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
              <span className="hidden sm:inline">CAD Bounding Box Auto-Measure</span>
              <span className="sm:hidden">CAD Bounding Box</span>
            </h1>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-block">
              AABB + OBB (PCA)
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hidden md:inline-flex items-center gap-1">
              <Cpu className="w-2.5 h-2.5" /> Client-Side
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden md:block">
            Tự động trích xuất kích thước phủ bì chi tiết STEP (.stp/.step) trực tiếp trên trình duyệt
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Mobile / Tablet Toggle Sidebar Button */}
        {modelLoaded && onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`lg:hidden px-2.5 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all shadow-sm ${
              sidebarOpen
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/30'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-600/60 hover:bg-emerald-900/60'
            }`}
            title="Mở Bảng thông số kích thước & Xuất file"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[11px]">Thông số</span>
          </button>
        )}

        {modelLoaded && (
          <button
            onClick={onOpenUpload}
            disabled={isLoading}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Tải file STEP khác"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Mở file</span>
          </button>
        )}

        {!modelLoaded && (
          <button
            onClick={onLoadSample}
            disabled={isLoading}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 active:bg-emerald-950 border border-emerald-700/50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-950 disabled:opacity-50 cursor-pointer"
            title="Thử nghiệm nhanh với file mẫu .step"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mẫu Demo</span>
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
