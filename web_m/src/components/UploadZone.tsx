import React, { useRef, useState } from 'react';
import { UploadCloud, FileCode2, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  onLoadSample: (sampleName: string) => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFileSelect,
  onLoadSample,
  isLoading,
  errorMessage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndProcess(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndProcess(file);
    }
    // Reset file input value so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateAndProcess = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'step' || ext === 'stp') {
      onFileSelect(file);
    } else {
      alert('Vui lòng chọn file định dạng CAD STEP (.step hoặc .stp)!');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/60">
      <div className="max-w-xl w-full">
        {/* Main dropzone box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isLoading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01] shadow-2xl shadow-cyan-500/20'
              : 'border-slate-700/80 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-900/90'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".step,.stp,.STEP,.STP"
            className="hidden"
            onChange={handleFileInput}
            disabled={isLoading}
          />

          {/* Hover highlight circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:border-cyan-500/40 group-hover:text-cyan-400 text-slate-300 transition-all shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-slate-100 mb-2">
            Kéo thả hoặc tải lên file CAD STEP
          </h2>
          <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
            Hỗ trợ định dạng chuẩn <code className="text-cyan-400 font-mono bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800/40">.step</code> và <code className="text-cyan-400 font-mono bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800/40">.stp</code>
          </p>

          <button
            type="button"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all group-hover:shadow-cyan-500/40"
          >
            Chọn file từ máy tính
          </button>

          {/* Client-side privacy badge */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>100% Client-side: Dữ liệu được xử lý trực tiếp trên trình duyệt, không tải lên server</span>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Xảy ra lỗi khi mở file:</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Quick sample models section */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Chưa có sẵn file? Thử nghiệm ngay mô hình mẫu:
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample('/Part2.stp');
              }}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-800 border border-slate-700 flex items-center gap-2.5 text-left transition-colors cursor-pointer group/btn"
            >
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover/btn:bg-emerald-500/20">
                <FileCode2 className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-xs font-semibold text-slate-200 block group-hover/btn:text-white truncate">
                  Chi tiết Part2.stp
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  Đĩa tròn + Cánh vươn (11 KB)
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample('/sample_bracket.step');
              }}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-800 border border-slate-700 flex items-center gap-2.5 text-left transition-colors cursor-pointer group/btn"
            >
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover/btn:bg-cyan-500/20">
                <FileCode2 className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-xs font-semibold text-slate-200 block group-hover/btn:text-white truncate">
                  Rounded Cube
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  Khối vát góc 3D (21 KB)
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample('/sample_assembly.stp');
              }}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-800 border border-slate-700 flex items-center gap-2.5 text-left transition-colors cursor-pointer group/btn"
            >
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover/btn:bg-amber-500/20">
                <FileCode2 className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-xs font-semibold text-slate-200 block group-hover/btn:text-white truncate">
                  AS1 Assembly
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  Cụm lắp ráp 18 chi tiết
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
