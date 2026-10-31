import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { Sidebar } from './components/Sidebar';
import { Canvas3D } from './components/Canvas3D';
import { ProgressBar } from './components/ProgressBar';
import {
  ParsedCADModel,
  ParseStatus,
  OBBStrategy,
  Vector3D,
  OBBFaceOffsets,
  DEFAULT_OFFSETS,
} from './utils/types';
import { stepParserService } from './utils/stepParserService';
import {
  computeOBBAtAngle,
  computeOBBForFaceNormal,
  applyOffsetsToOBB,
} from './utils/boundingBox';
import {
  exportMultiPartSTEP,
  exportBoxOnlySTEP,
  exportMultiBodyOBJ,
  exportMultiBodyGLTF,
  exportOBBReportJSON,
} from './utils/cadExporter';

export const App: React.FC = () => {
  const [model, setModel] = useState<ParsedCADModel | null>(null);
  const [offsets, setOffsets] = useState<OBBFaceOffsets>(DEFAULT_OFFSETS);
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle');
  const [progressStep, setProgressStep] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Visual toggles
  const [showAABB, setShowAABB] = useState<boolean>(true);
  const [showOBB, setShowOBB] = useState<boolean>(true);
  const [showEdges, setShowEdges] = useState<boolean>(true);
  const [showSolidMesh, setShowSolidMesh] = useState<boolean>(true);
  const [showFillBox, setShowFillBox] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);

  // Upload modal for replacing current model
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);

  // Compute active OBB with applied face offsets in real-time
  const activeOBB = useMemo(() => {
    if (!model?.obb) return null;
    return applyOffsetsToOBB(model.obb, offsets);
  }, [model?.obb, offsets]);

  const startParsingBuffer = (
    buffer: ArrayBuffer,
    fileName: string,
    fileSize: number,
    rawStepText?: string
  ) => {
    setParseStatus('reading_file');
    setProgressStep('Đang khởi tạo nhân phân tích CAD WebAssembly...');
    setProgressPercent(10);
    setErrorMessage(null);

    stepParserService.parseStepFile(buffer, fileName, fileSize, {
      onProgress: (step, percent) => {
        setProgressStep(step);
        setProgressPercent(percent);
      },
      onSuccess: (result) => {
        if (!result.allPositions) {
          let totalCoords = 0;
          for (const m of result.meshes) {
            if (m.attributes?.position?.array) {
              totalCoords += m.attributes.position.array.length;
            }
          }
          const allPos = new Float32Array(totalCoords);
          let offset = 0;
          for (const m of result.meshes) {
            const arr = m.attributes?.position?.array;
            if (arr && arr.length > 0) {
              const f32 = arr instanceof Float32Array ? arr : new Float32Array(arr);
              allPos.set(f32, offset);
              offset += f32.length;
            }
          }
          result.allPositions = allPos;
        }

        // Store the original STEP text content for multi-part STEP export
        result.rawStepText = rawStepText;

        setModel(result);
        setOffsets(DEFAULT_OFFSETS); // Reset offsets for new model
        setParseStatus('ready');
        setShowUploadModal(false);
      },
      onError: (err) => {
        setErrorMessage(err);
        setParseStatus('error');
      },
    });
  };

  const handleFileSelect = (file: File) => {
    setParseStatus('reading_file');
    setProgressStep(`Đang đọc file ${file.name}...`);
    setProgressPercent(5);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        let rawStepText: string | undefined;
        try {
          rawStepText = new TextDecoder('utf-8').decode(buffer);
        } catch {
          // ignore decode errors
        }
        startParsingBuffer(buffer, file.name, file.size, rawStepText);
      } else {
        setErrorMessage('Không thể đọc dữ liệu file.');
        setParseStatus('error');
      }
    };
    reader.onerror = () => {
      setErrorMessage('Lỗi khi đọc file từ ổ đĩa.');
      setParseStatus('error');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleLoadSample = async (samplePath: string = '/sample_bracket.step') => {
    try {
      setParseStatus('reading_file');
      setProgressStep('Đang tải mô hình mẫu từ hệ thống...');
      setProgressPercent(10);
      setErrorMessage(null);

      const res = await fetch(samplePath);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Không thể tải file mẫu ${samplePath}`);
      }
      const buffer = await res.arrayBuffer();
      const fileName = samplePath.split('/').pop() || 'sample.step';
      let rawStepText: string | undefined;
      try {
        rawStepText = new TextDecoder('utf-8').decode(buffer);
      } catch {
        // ignore
      }
      startParsingBuffer(buffer, fileName, buffer.byteLength, rawStepText);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tải file mẫu.');
      setParseStatus('error');
    }
  };

  const handleCancel = () => {
    stepParserService.terminate();
    setParseStatus(model ? 'ready' : 'idle');
    setProgressStep('');
    setProgressPercent(0);
  };

  const handleReset = () => {
    stepParserService.terminate();
    setModel(null);
    setOffsets(DEFAULT_OFFSETS);
    setParseStatus('idle');
    setErrorMessage(null);
  };

  // Real-time angle / strategy change
  const handleAngleChange = (angleDeg: number, strategy: OBBStrategy = 'custom') => {
    if (!model || !model.allPositions) return;

    const newOBB = computeOBBAtAngle(
      model.allPositions,
      model.obb.normalAxis,
      model.obb.baseU,
      model.obb.baseV,
      angleDeg,
      strategy,
      model.obb.availableStrategies,
      model.obb.selectedFaceId
    );

    setModel({
      ...model,
      obb: newOBB,
    });
  };

  // Face alignment (either clicked on 3D canvas or selected from Dominant Faces list)
  const handleSelectFace = (normal: Vector3D, faceId: number | null = null) => {
    if (!model || !model.allPositions) return;

    const newOBB = computeOBBForFaceNormal(model.allPositions, normal, faceId);

    setModel({
      ...model,
      obb: {
        ...newOBB,
        availableStrategies: model.obb.availableStrategies,
      },
    });
  };

  // CAD STEP Export handlers
  const handleExportSTEP = () => {
    if (!model || !activeOBB) return;
    exportMultiPartSTEP(model, activeOBB);
  };

  const handleExportBoxSTEP = () => {
    if (!model || !activeOBB) return;
    exportBoxOnlySTEP(model, activeOBB);
  };

  const handleExportOBJ = () => {
    if (!model || !activeOBB) return;
    exportMultiBodyOBJ(model, activeOBB, offsets);
  };

  const handleExportGLTF = () => {
    if (!model || !activeOBB) return;
    exportMultiBodyGLTF(model, activeOBB, offsets);
  };

  const handleExportJSON = () => {
    if (!model || !activeOBB) return;
    exportOBBReportJSON(model, model.obb, activeOBB, offsets);
  };

  const isLoading =
    parseStatus === 'reading_file' ||
    parseStatus === 'loading_wasm' ||
    parseStatus === 'parsing_geometry' ||
    parseStatus === 'computing_bounds';

  return (
    <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Header
        modelLoaded={!!model}
        onReset={handleReset}
        onLoadSample={() => handleLoadSample('/sample_bracket.step')}
        onOpenUpload={() => setShowUploadModal(true)}
        isLoading={isLoading}
      />

      <main className="flex-1 flex min-h-0 min-w-0 overflow-hidden relative">
        {errorMessage && model && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-950/95 border border-rose-700 text-rose-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs max-w-lg">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white font-bold ml-auto px-1"
            >
              ✕
            </button>
          </div>
        )}

        {!model ? (
          <UploadZone
            onFileSelect={handleFileSelect}
            onLoadSample={handleLoadSample}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        ) : (
          <div className="flex-1 flex w-full h-full min-h-0 min-w-0 overflow-hidden">
            <Canvas3D
              model={model}
              activeOBB={activeOBB}
              showAABB={showAABB}
              showOBB={showOBB}
              showEdges={showEdges}
              showSolidMesh={showSolidMesh}
              showFillBox={showFillBox}
              showDimensions={showDimensions}
              setShowDimensions={setShowDimensions}
              onFacePicked={(normal) => handleSelectFace(normal, null)}
            />

            <Sidebar
              model={model}
              activeOBB={activeOBB || model.obb}
              offsets={offsets}
              setOffsets={setOffsets}
              showAABB={showAABB}
              setShowAABB={setShowAABB}
              showOBB={showOBB}
              setShowOBB={setShowOBB}
              showEdges={showEdges}
              setShowEdges={setShowEdges}
              showSolidMesh={showSolidMesh}
              setShowSolidMesh={setShowSolidMesh}
              showFillBox={showFillBox}
              setShowFillBox={setShowFillBox}
              showDimensions={showDimensions}
              setShowDimensions={setShowDimensions}
              onAngleChange={handleAngleChange}
              onSelectFace={(normal, faceId) => handleSelectFace(normal, faceId ?? null)}
              onExportSTEP={handleExportSTEP}
              onExportBoxSTEP={handleExportBoxSTEP}
              onExportOBJ={handleExportOBJ}
              onExportGLTF={handleExportGLTF}
              onExportJSON={handleExportJSON}
            />
          </div>
        )}

        {showUploadModal && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-40 flex items-center justify-center p-4">
            <div className="relative max-w-2xl w-full">
              <button
                onClick={() => setShowUploadModal(false)}
                className="absolute top-4 right-4 z-50 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
              <UploadZone
                onFileSelect={handleFileSelect}
                onLoadSample={handleLoadSample}
                isLoading={isLoading}
                errorMessage={errorMessage}
              />
            </div>
          </div>
        )}

        {isLoading && (
          <ProgressBar
            step={progressStep}
            percent={progressPercent}
            onCancel={handleCancel}
          />
        )}
      </main>
    </div>
  );
};

export default App;
