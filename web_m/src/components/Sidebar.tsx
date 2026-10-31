import React, { useState } from 'react';
import {
  Box,
  Compass,
  Layers,
  Copy,
  Check,
  Info,
  TrendingDown,
  Sliders,
  Ruler,
  MousePointerClick,
  ChevronDown,
  Download,
  Package,
  Boxes,
  FileCode,
  FileSpreadsheet,
  RotateCcw,
} from 'lucide-react';
import {
  ParsedCADModel,
  OBBStrategy,
  Vector3D,
  OBBResult,
  OBBFaceOffsets,
  DEFAULT_OFFSETS,
} from '../utils/types';
import { formatDim, formatVolume } from '../utils/threeHelpers';

interface SidebarProps {
  model: ParsedCADModel;
  activeOBB: OBBResult;
  offsets: OBBFaceOffsets;
  setOffsets: React.Dispatch<React.SetStateAction<OBBFaceOffsets>>;
  showAABB: boolean;
  setShowAABB: (v: boolean) => void;
  showOBB: boolean;
  setShowOBB: (v: boolean) => void;
  showEdges: boolean;
  setShowEdges: (v: boolean) => void;
  showSolidMesh: boolean;
  setShowSolidMesh: (v: boolean) => void;
  showFillBox: boolean;
  setShowFillBox: (v: boolean) => void;
  showDimensions: boolean;
  setShowDimensions: (v: boolean) => void;
  onAngleChange: (angleDeg: number, strategy?: OBBStrategy) => void;
  onSelectFace: (normal: Vector3D, faceId?: number) => void;
  onExportSTEP: () => void;
  onExportBoxSTEP: () => void;
  onExportOBJ: () => void;
  onExportGLTF: () => void;
  onExportJSON: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  model,
  activeOBB,
  offsets,
  setOffsets,
  showAABB,
  setShowAABB,
  showOBB,
  setShowOBB,
  showEdges,
  setShowEdges,
  showSolidMesh,
  setShowSolidMesh,
  showFillBox,
  setShowFillBox,
  showDimensions,
  setShowDimensions,
  onAngleChange,
  onSelectFace,
  onExportSTEP,
  onExportBoxSTEP,
  onExportOBJ,
  onExportGLTF,
  onExportJSON,
}) => {
  const [copied, setCopied] = useState(false);
  const [showFaceList, setShowFaceList] = useState(false);
  const [showAdvancedOffsets, setShowAdvancedOffsets] = useState(false);

  const { aabb, obb: baseOBB, stats, planarFaces = [] } = model;
  const currentAngle = baseOBB.angleDeg || 0;

  const hasOffsets =
    offsets.uniform > 0 ||
    offsets.extraLength > 0 ||
    offsets.extraWidth > 0 ||
    offsets.extraBottom > 0 ||
    offsets.extraTop > 0;

  const volumeSavings =
    aabb.volume > 0 ? Math.max(0, ((aabb.volume - baseOBB.volume) / aabb.volume) * 100) : 0;

  const copyToClipboard = () => {
    const text = `
=== BÁO CÁO KÍCH THƯỚC PHỦ BÌ CAD (BOUNDING BOX) ===
Tên file: ${model.name}
Kích thước file: ${(model.fileSize / 1024).toFixed(1)} KB
Số đỉnh: ${stats.vertexCount.toLocaleString()} | Số tam giác: ${stats.triangleCount.toLocaleString()}
Số nhóm mặt phẳng nhận diện: ${planarFaces.length}

1. KÍCH THƯỚC PHỦ BÌ TRỤC MẶC ĐỊNH (AABB):
- Dài x Rộng x Cao: ${formatDim(aabb.dimensions.length)} x ${formatDim(aabb.dimensions.width)} x ${formatDim(aabb.dimensions.height)} mm
- Chi tiết trục XYZ:
  + X: ${formatDim(aabb.size.x)} mm
  + Y: ${formatDim(aabb.size.y)} mm
  + Z: ${formatDim(aabb.size.z)} mm
- Thể tích bao AABB: ${formatVolume(aabb.volume)}

2. KÍCH THƯỚC PHỦ BÌ THÔNG MINH (OBB GỐC):
- Chế độ định hướng: ${
      baseOBB.strategy === 'face_aligned'
        ? `Bám theo mặt phẳng #${baseOBB.selectedFaceId || 'chọn chuột'}`
        : baseOBB.strategy
    } (Góc xoay: ${currentAngle.toFixed(1)}°)
- Dài x Rộng x Cao: ${formatDim(baseOBB.dimensions.length)} x ${formatDim(baseOBB.dimensions.width)} x ${formatDim(baseOBB.dimensions.height)} mm
- Chi tiết 3 trục tự nhiên:
  + Trục 1 (Dài): ${formatDim(baseOBB.size.x)} mm
  + Trục 2 (Rộng): ${formatDim(baseOBB.size.y)} mm
  + Trục 3 (Cao): ${formatDim(baseOBB.size.z)} mm
- Thể tích bao OBB gốc: ${formatVolume(baseOBB.volume)}
- So sánh với AABB: ${volumeSavings > 0 ? `Tiết kiệm ${volumeSavings.toFixed(1)}% so với AABB` : 'Bằng AABB'}
${
  hasOffsets
    ? `
3. THÔNG SỐ VÁCH / KHAY TRAY (OBB ĐÃ BÙ TRỪ OFFSET):
- Bù trừ đã áp dụng:
  + Offset đều (Uniform): +${offsets.uniform} mm
  + Trục Dài (±L): +${offsets.extraLength} mm mỗi đầu
  + Trục Rộng (±W): +${offsets.extraWidth} mm mỗi bên
  + Đáy khay (-Z): +${offsets.extraBottom} mm
  + Nắp đậy (+Z): +${offsets.extraTop} mm
- Kích thước vách / khay: ${formatDim(activeOBB.dimensions.length)} x ${formatDim(activeOBB.dimensions.width)} x ${formatDim(activeOBB.dimensions.height)} mm
- Chi tiết 3 trục khay:
  + Trục 1 (Dài): ${formatDim(activeOBB.size.x)} mm
  + Trục 2 (Rộng): ${formatDim(activeOBB.size.y)} mm
  + Trục 3 (Cao): ${formatDim(activeOBB.size.z)} mm
- Thể tích khay sau bù trừ: ${formatVolume(activeOBB.volume)}
`
    : ''
}===================================================
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUniformOffsetChange = (val: number) => {
    setOffsets((prev) => ({ ...prev, uniform: Math.max(0, val) }));
  };

  const handleResetOffsets = () => {
    setOffsets(DEFAULT_OFFSETS);
  };

  return (
    <aside className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full min-h-0 min-w-0 overflow-hidden text-slate-200 z-10 shrink-0">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between shrink-0">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Kết quả đo lường tự động
          </span>
          <h2 className="text-sm font-bold text-white truncate max-w-[210px]" title={model.name}>
            {model.name}
          </h2>
        </div>
        <button
          onClick={copyToClipboard}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          title="Sao chép toàn bộ thông số kích thước"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Đã chép!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-300" />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* ======================================================== */}
        {/* 1. OBB Card (Primary Smart Oriented Bounding Box)        */}
        {/* ======================================================== */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 p-4 shadow-lg shadow-emerald-950/20 relative overflow-hidden">
          {/* Top row with Title and Toggle */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-emerald-400">
                    OBB (Oriented Bounding Box)
                  </h3>
                </div>
                <span className="text-[10px] text-emerald-300/80 font-mono">
                  {baseOBB.strategy === 'face_aligned'
                    ? '🎯 Đang bám theo mặt phẳng'
                    : 'Đa chiến lược & Tự động xoay ôm khít'}
                </span>
              </div>
            </div>

            {/* Toggle switch for wireframe */}
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showOBB}
                onChange={(e) => setShowOBB(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 relative"></div>
            </label>
          </div>

          {/* Smart Strategy Presets */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Chiến lược định hướng hộp bao:
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-400">
                θ = {currentAngle.toFixed(1)}°
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {baseOBB.availableStrategies?.map((strat) => {
                const isActive = baseOBB.strategy === strat.id;
                return (
                  <button
                    key={strat.id}
                    onClick={() => onAngleChange(strat.angleDeg, strat.id)}
                    className={`px-2 py-1.5 rounded-lg text-left transition-all border text-[11px] flex flex-col justify-between cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold shadow-sm shadow-emerald-500/20'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950/80'
                    }`}
                    title={strat.description}
                  >
                    <span className="truncate block font-semibold">
                      {strat.id === 'min_volume'
                        ? '🎯 Tối ưu thể tích'
                        : strat.id === 'max_reach'
                        ? '📐 Trục vươn xa'
                        : '⚡ Quán tính PCA'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {strat.angleDeg.toFixed(1)}°
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Planar Faces Selector (For Multi-faceted files!) */}
            {planarFaces && planarFaces.length > 0 && (
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => setShowFaceList(!showFaceList)}
                  className="w-full px-2.5 py-1.5 bg-slate-950/60 hover:bg-slate-950 border border-emerald-500/30 rounded-lg text-left text-xs text-slate-300 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <MousePointerClick className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      {baseOBB.strategy === 'face_aligned'
                        ? `Đang căn theo: Mặt #${baseOBB.selectedFaceId || 'được chọn'}`
                        : `Chọn mặt làm chuẩn đáy (${planarFaces.length} mặt phẳng)`}
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      showFaceList ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showFaceList && (
                  <div className="mt-1 max-h-40 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-1.5 space-y-1 text-[11px]">
                    <div className="text-[10px] text-slate-400 px-1 py-0.5">
                      Chọn một mặt phẳng bất kỳ để đặt đáy hộp phủ bì áp sát mặt đó:
                    </div>
                    {planarFaces.slice(0, 10).map((f) => {
                      const isSelected = baseOBB.selectedFaceId === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => {
                            onSelectFace(f.normal, f.id);
                            setShowFaceList(false);
                          }}
                          className={`w-full px-2 py-1 rounded text-left flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <span className="truncate font-medium">Mặt #{f.id}</span>
                          <span className="font-mono text-slate-400">{f.area} mm²</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Interactive Angle Slider */}
            <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-emerald-400" />
                  <span>Xoay góc tùy chỉnh quanh trục chính:</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold">{currentAngle.toFixed(1)}°</span>
              </div>

              <input
                type="range"
                min="0"
                max="180"
                step="0.5"
                value={currentAngle}
                onChange={(e) => onAngleChange(parseFloat(e.target.value), 'custom')}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 mb-2"
              />

              {/* Quick angle snap buttons */}
              <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                {[0, 30, 45, 90, 135].map((snapDeg) => (
                  <button
                    key={snapDeg}
                    onClick={() => onAngleChange(snapDeg, 'custom')}
                    className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                      Math.abs(currentAngle - snapDeg) < 0.3
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {snapDeg}°
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main primary dimension callout */}
          <div className="bg-slate-950/80 rounded-xl p-3 border border-emerald-500/30 mb-3 shadow-inner">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Kích thước phủ bì chi tiết gốc (Dài x Rộng x Cao)
            </span>
            <div className="text-lg font-black text-white font-mono tracking-tight flex items-baseline gap-1">
              <span className="text-emerald-400">{formatDim(baseOBB.dimensions.length)}</span>
              <span className="text-slate-500">×</span>
              <span className="text-emerald-300">{formatDim(baseOBB.dimensions.width)}</span>
              <span className="text-slate-500">×</span>
              <span className="text-emerald-200">{formatDim(baseOBB.dimensions.height)}</span>
              <span className="text-xs font-normal text-slate-400 ml-1">mm</span>
            </div>
          </div>

          {/* Detailed Axis Breakdown */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Dài (Trục 1)</span>
              <span className="text-xs font-bold text-slate-100 font-mono">
                {formatDim(baseOBB.size.x)} mm
              </span>
            </div>
            <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Rộng (Trục 2)</span>
              <span className="text-xs font-bold text-slate-100 font-mono">
                {formatDim(baseOBB.size.y)} mm
              </span>
            </div>
            <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Cao (Trục 3)</span>
              <span className="text-xs font-bold text-slate-100 font-mono">
                {formatDim(baseOBB.size.z)} mm
              </span>
            </div>
          </div>

          {/* Volume and Savings Badge */}
          <div className="pt-2 border-t border-emerald-900/30 flex items-center justify-between text-xs">
            <div className="text-slate-400">
              Thể tích bao gốc: <span className="font-mono text-slate-200 font-semibold">{formatVolume(baseOBB.volume)}</span>
            </div>
            {volumeSavings > 0.05 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <TrendingDown className="w-3 h-3" />
                Tiết kiệm {volumeSavings.toFixed(1)}%
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">
                {currentAngle === 0 && baseOBB.strategy !== 'face_aligned'
                  ? 'Trùng góc AABB'
                  : `Góc xoay: ${currentAngle.toFixed(1)}°`}
              </span>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. AABB Card (Axis-Aligned Bounding Box)                 */}
        {/* ======================================================== */}
        <div className="rounded-2xl bg-gradient-to-br from-sky-950/20 via-slate-900 to-slate-900 border border-sky-500/30 p-4 shadow-lg shadow-sky-950/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-sky-400">
                  AABB (Axis-Aligned Bounding Box)
                </h3>
                <span className="text-[10px] text-sky-300/70 font-mono">
                  Trục tọa độ không gian mặc định (XYZ)
                </span>
              </div>
            </div>

            {/* Toggle switch for wireframe */}
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showAABB}
                onChange={(e) => setShowAABB(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500 relative"></div>
            </label>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-sky-500/20 mb-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Kích thước phủ bì tổng thể (Dài x Rộng x Cao)
            </span>
            <div className="text-lg font-black text-white font-mono tracking-tight flex items-baseline gap-1">
              <span className="text-sky-400">{formatDim(aabb.dimensions.length)}</span>
              <span className="text-slate-500">×</span>
              <span className="text-sky-300">{formatDim(aabb.dimensions.width)}</span>
              <span className="text-slate-500">×</span>
              <span className="text-sky-200">{formatDim(aabb.dimensions.height)}</span>
              <span className="text-xs font-normal text-slate-400 ml-1">mm</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Trục X</span>
              <span className="text-xs font-bold text-slate-100 font-mono">
                {formatDim(aabb.size.x)} mm
              </span>
            </div>
            <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Trục Y</span>
              <span className="text-xs font-bold text-slate-100 font-mono">
                {formatDim(aabb.size.y)} mm
              </span>
            </div>
            <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Trục Z</span>
              <span className="text-xs font-bold text-slate-100 font-mono">
                {formatDim(aabb.size.z)} mm
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-sky-900/30 text-xs text-slate-400">
            Thể tích bao: <span className="font-mono text-slate-200 font-semibold">{formatVolume(aabb.volume)}</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. FACE OFFSET SECTION (BÙ TRỪ KÍCH THƯỚC LÀM VÁCH / KHAY) */}
        {/* ======================================================== */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/40 p-4 shadow-lg shadow-amber-950/20 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-300">
                  Bù trừ làm Vách / Khay (Face Offset)
                </h3>
                <span className="text-[10px] text-amber-200/70 block">
                  Tạo khoảng hở vách ngăn, khay hút định hình (Tray)
                </span>
              </div>
            </div>

            {hasOffsets && (
              <button
                onClick={handleResetOffsets}
                className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="Khôi phục về kích thước ôm sát ban đầu"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>

          {/* Uniform Offset Slider */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-amber-500/20 mb-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Offset đều các mặt (Uniform):</span>
              <div className="flex items-center gap-1 font-mono">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={offsets.uniform}
                  onChange={(e) => handleUniformOffsetChange(parseFloat(e.target.value) || 0)}
                  className="w-14 px-1.5 py-0.5 bg-slate-900 border border-amber-500/40 rounded text-right text-amber-300 text-xs font-bold focus:outline-none focus:border-amber-400"
                />
                <span className="text-[11px] text-slate-400">mm</span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="30"
              step="0.5"
              value={offsets.uniform}
              onChange={(e) => handleUniformOffsetChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 mb-2"
            />

            {/* Quick preset buttons */}
            <div className="grid grid-cols-6 gap-1 text-[10px] font-mono">
              {[0, 1, 2, 3, 5, 10].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleUniformOffsetChange(preset)}
                  className={`py-1 rounded border transition-colors cursor-pointer text-center ${
                    offsets.uniform === preset
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible Advanced Directional Offsets */}
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowAdvancedOffsets(!showAdvancedOffsets)}
              className="w-full px-2.5 py-1.5 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 rounded-lg text-left text-xs text-slate-300 flex items-center justify-between cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Bù trừ chi tiết từng mặt (Dài / Rộng / Đáy / Nắp)</span>
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  showAdvancedOffsets ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showAdvancedOffsets && (
              <div className="mt-2 p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">± Trục Dài (mỗi đầu):</span>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={offsets.extraLength}
                      onChange={(e) =>
                        setOffsets((prev) => ({
                          ...prev,
                          extraLength: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                      }
                      className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-right text-slate-100 text-xs"
                    />
                    <span className="text-slate-400">mm</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">± Trục Rộng (mỗi bên):</span>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={offsets.extraWidth}
                      onChange={(e) =>
                        setOffsets((prev) => ({
                          ...prev,
                          extraWidth: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                      }
                      className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-right text-slate-100 text-xs"
                    />
                    <span className="text-slate-400">mm</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">− Mặt Đáy (-Z khay):</span>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={offsets.extraBottom}
                      onChange={(e) =>
                        setOffsets((prev) => ({
                          ...prev,
                          extraBottom: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                      }
                      className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-right text-slate-100 text-xs"
                    />
                    <span className="text-slate-400">mm</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">+ Mặt Nắp / Miệng (+Z):</span>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={offsets.extraTop}
                      onChange={(e) =>
                        setOffsets((prev) => ({
                          ...prev,
                          extraTop: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                      }
                      className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-right text-slate-100 text-xs"
                    />
                    <span className="text-slate-400">mm</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dimensions Comparison Box */}
          <div className="bg-slate-950/90 rounded-xl p-3 border border-amber-500/30">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block mb-1">
              Kích thước vách / khay sau bù trừ (L × W × H)
            </span>
            <div className="text-base font-black text-white font-mono tracking-tight flex items-baseline gap-1 mb-2">
              <span className="text-amber-300">{formatDim(activeOBB.dimensions.length)}</span>
              <span className="text-slate-500">×</span>
              <span className="text-amber-300">{formatDim(activeOBB.dimensions.width)}</span>
              <span className="text-slate-500">×</span>
              <span className="text-amber-200">{formatDim(activeOBB.dimensions.height)}</span>
              <span className="text-xs font-normal text-slate-400 ml-1">mm</span>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1.5 border-t border-slate-800">
              <span>Thể tích khay:</span>
              <span className="font-mono text-amber-200 font-bold">
                {formatVolume(activeOBB.volume)}
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. 3D MULTI-PART EXPORT SECTION (XUẤT FILE STEP & 3D)    */}
        {/* ======================================================== */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/50 p-4 shadow-lg shadow-emerald-950/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-300">
                Xuất file CAD STEP 3D (2 Parts riêng)
              </h3>
              <span className="text-[10px] text-emerald-200/70 block">
                Part 1: Chi tiết CAD gốc | Part 2: Khối hộp OBB khay
              </span>
            </div>
          </div>

          <div className="space-y-2 mt-3">
            {/* 1. PRIMARY STEP MULTI-PART EXPORT BUTTON */}
            <button
              onClick={onExportSTEP}
              className="w-full p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-between cursor-pointer transition-all shadow-md shadow-emerald-950/50 border border-emerald-400/40 group"
              title="Xuất file STEP AP203/214 gồm 2 Part / Solid Bodies riêng biệt, mở trực tiếp trên Autodesk Inventor, SolidWorks, Rhino"
            >
              <div className="flex items-center gap-2 text-left">
                <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                <div>
                  <div className="font-bold text-white leading-tight">
                    Xuất file STEP (.stp) - 2 Parts riêng
                  </div>
                  <div className="text-[10px] text-emerald-100 font-normal">
                    Chuẩn Solid B-Rep cho Inventor & SolidWorks
                  </div>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono font-bold">
                .STP
              </span>
            </button>

            {/* 2. STANDALONE STEP BOX SOLID */}
            <button
              onClick={onExportBoxSTEP}
              className="w-full p-2 rounded-lg bg-slate-950/60 hover:bg-slate-950 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 hover:text-white text-xs flex items-center justify-between cursor-pointer transition-colors"
              title="Xuất riêng khối hộp OBB Tray dạng Solid B-Rep STEP để chèn vào cụm lắp ráp Assembly"
            >
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-emerald-400" />
                <span>Xuất file STEP (.stp) - Chỉ Hộp OBB Tray</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                .STP
              </span>
            </button>

            {/* 3. MULTI-BODY OBJ */}
            <button
              onClick={onExportOBJ}
              className="w-full p-2 rounded-lg bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs flex items-center justify-between cursor-pointer transition-colors"
              title="Xuất file Wavefront OBJ gồm 2 body độc lập"
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>Xuất file 3D OBJ (Gồm 2 Parts riêng)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400">
                .OBJ
              </span>
            </button>

            {/* 4. JSON REPORT */}
            <button
              onClick={onExportJSON}
              className="w-full p-2 rounded-lg bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs flex items-center justify-between cursor-pointer transition-colors"
              title="Tải báo cáo JSON chứa đầy đủ tọa độ 8 góc OBB và thông số tham số CAD"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                <span>Tải tọa độ 8 góc OBB (JSON Report)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400">
                .JSON
              </span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. Display Layer Settings                                */}
        {/* ======================================================== */}
        <div className="rounded-2xl bg-slate-950/50 border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tùy chỉnh hiển thị mô hình 3D
            </h4>
          </div>

          <div className="space-y-2.5 text-xs">
            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 cursor-pointer transition-colors">
              <span className="text-slate-300 flex items-center gap-2">
                <Ruler className="w-3.5 h-3.5 text-emerald-400" />
                <span>Thước đo kích thước 3D (Dimension Callouts)</span>
              </span>
              <input
                type="checkbox"
                checked={showDimensions}
                onChange={(e) => setShowDimensions(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 cursor-pointer transition-colors">
              <span className="text-slate-300">Khối chi tiết CAD (Solid)</span>
              <input
                type="checkbox"
                checked={showSolidMesh}
                onChange={(e) => setShowSolidMesh(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 cursor-pointer transition-colors">
              <span className="text-slate-300">Đường nét cạnh CAD (Edge Lines)</span>
              <input
                type="checkbox"
                checked={showEdges}
                onChange={(e) => setShowEdges(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 cursor-pointer transition-colors">
              <span className="text-slate-300">Mặt mờ bao quanh Bounding Box</span>
              <input
                type="checkbox"
                checked={showFillBox}
                onChange={(e) => setShowFillBox(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700 focus:ring-0"
              />
            </label>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 6. Model Statistics                                      */}
        {/* ======================================================== */}
        <div className="rounded-2xl bg-slate-950/50 border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-slate-400" />
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Thông số hình học chi tiết
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800/60">
              <span className="text-slate-500 block text-[10px]">Số đỉnh (Vertices)</span>
              <span className="text-slate-200 font-bold">
                {stats.vertexCount.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800/60">
              <span className="text-slate-500 block text-[10px]">Số tam giác (Faces)</span>
              <span className="text-slate-200 font-bold">
                {stats.triangleCount.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800/60">
              <span className="text-slate-500 block text-[10px]">Số mặt phẳng nhận diện</span>
              <span className="text-slate-200 font-bold">{planarFaces.length} nhóm</span>
            </div>
            <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800/60">
              <span className="text-slate-500 block text-[10px]">Diện tích bề mặt</span>
              <span className="text-slate-200 font-bold">
                {stats.surfaceArea.toFixed(0)} mm²
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
