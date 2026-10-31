import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParsedCADModel, Vector3D, OBBResult } from '../utils/types';
import {
  buildCADSceneObject,
  createAABBVisualizer,
  createOBBVisualizer,
  formatDim,
} from '../utils/threeHelpers';
import {
  Camera,
  RotateCcw,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Grid,
  Ruler,
  MousePointerClick,
  Sliders,
  ChevronRight,
} from 'lucide-react';

interface Canvas3DProps {
  model: ParsedCADModel;
  activeOBB?: OBBResult | null;
  showAABB: boolean;
  showOBB: boolean;
  showEdges: boolean;
  showSolidMesh: boolean;
  showFillBox: boolean;
  showDimensions: boolean;
  setShowDimensions: (v: boolean) => void;
  onFacePicked?: (normal: Vector3D) => void;
  onOpenSidebar?: () => void;
}

export const Canvas3D: React.FC<Canvas3DProps> = ({
  model,
  activeOBB,
  showAABB,
  showOBB,
  showEdges,
  showSolidMesh,
  showFillBox,
  showDimensions,
  setShowDimensions,
  onFacePicked,
  onOpenSidebar,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Scene references
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const aabbVisualizerRef = useRef<THREE.Group | null>(null);
  const obbVisualizerRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const faceHighlightRef = useRef<THREE.Mesh | null>(null);

  // View state
  const [autoRotate, setAutoRotate] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPickFaceMode, setIsPickFaceMode] = useState(true); // Enabled by default for intuitive UX

  // Track mouse down to distinguish clicks from drags
  const mouseDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1120');
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100000
    );
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.maxDistance = 80000;
    controls.minDistance = 1;
    controlsRef.current = controls;

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.6);
    hemiLight.position.set(0, 1000, 0);
    scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(2000, 4000, 3000);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.6);
    dirLight2.position.set(-2000, -2000, -2000);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight3.position.set(0, -4000, 0);
    scene.add(dirLight3);

    // 6. Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 2.0;
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // 7. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Load Model Geometry (only when mesh changes)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !model) return;

    if (modelGroupRef.current) {
      scene.remove(modelGroupRef.current);
      modelGroupRef.current = null;
    }
    if (aabbVisualizerRef.current) {
      scene.remove(aabbVisualizerRef.current);
      aabbVisualizerRef.current = null;
    }
    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
      gridHelperRef.current = null;
    }

    const { group } = buildCADSceneObject(model.meshes, showEdges);
    modelGroupRef.current = group;
    scene.add(group);

    const aabbVis = createAABBVisualizer(model.aabb);
    aabbVisualizerRef.current = aabbVis;
    aabbVis.visible = showAABB;
    scene.add(aabbVis);

    const maxDim = Math.max(
      model.aabb.size.x,
      model.aabb.size.y,
      model.aabb.size.z,
      10
    );

    const gridSize = Math.ceil((maxDim * 3) / 10) * 10;
    const gridDivisions = 30;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x334155, 0x1e293b);
    gridHelper.position.set(
      model.aabb.center.x,
      model.aabb.min.y,
      model.aabb.center.z
    );
    gridHelperRef.current = gridHelper;
    gridHelper.visible = showGrid;
    scene.add(gridHelper);

    fitCameraToObject();
  }, [model.name, model.meshes]);

  // Update OBB visualizer dynamically
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !model?.obb) return;

    if (obbVisualizerRef.current) {
      scene.remove(obbVisualizerRef.current);
      obbVisualizerRef.current = null;
    }

    const currentOBB = activeOBB || model.obb;
    const obbVis = createOBBVisualizer(currentOBB, showDimensions, model.obb);
    obbVisualizerRef.current = obbVis;
    obbVis.visible = showOBB;
    scene.add(obbVis);

    obbVis.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry) {
        child.visible = showFillBox;
      }
    });
  }, [model.obb, activeOBB, showDimensions]);

  // Visibility toggles
  useEffect(() => {
    if (aabbVisualizerRef.current) {
      aabbVisualizerRef.current.visible = showAABB;
    }
  }, [showAABB]);

  useEffect(() => {
    if (obbVisualizerRef.current) {
      obbVisualizerRef.current.visible = showOBB;
    }
  }, [showOBB]);

  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  useEffect(() => {
    if (modelGroupRef.current) {
      modelGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.visible = showSolidMesh;
        } else if (child instanceof THREE.LineSegments) {
          child.visible = showEdges;
        }
      });
    }
  }, [showSolidMesh, showEdges]);

  useEffect(() => {
    const updateFaces = (group: THREE.Group | null) => {
      if (!group) return;
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry) {
          child.visible = showFillBox;
        }
      });
    };
    updateFaces(aabbVisualizerRef.current);
    updateFaces(obbVisualizerRef.current);
  }, [showFillBox]);

  const fitCameraToObject = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || !model) return;

    const { center, size } = model.aabb;
    const maxDim = Math.max(size.x, size.y, size.z, 10);
    const fov = camera.fov * (Math.PI / 180);
    const distance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.8;

    camera.position.set(
      center.x + distance * 0.9,
      center.y + distance * 0.8,
      center.z + distance * 1.1
    );
    camera.near = Math.max(0.1, distance / 200);
    camera.far = distance * 20;
    camera.updateProjectionMatrix();

    controls.target.set(center.x, center.y, center.z);
    controls.update();
  };

  const setView = (direction: 'iso' | 'top' | 'front' | 'right') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || !model) return;

    const { center, size } = model.aabb;
    const maxDim = Math.max(size.x, size.y, size.z, 10);
    const fov = camera.fov * (Math.PI / 180);
    const dist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.8;

    controls.target.set(center.x, center.y, center.z);

    if (direction === 'iso') {
      camera.position.set(center.x + dist * 0.9, center.y + dist * 0.8, center.z + dist * 1.1);
    } else if (direction === 'top') {
      camera.position.set(center.x, center.y + dist * 1.6, center.z + 0.0001);
    } else if (direction === 'front') {
      camera.position.set(center.x, center.y, center.z + dist * 1.6);
    } else if (direction === 'right') {
      camera.position.set(center.x + dist * 1.6, center.y, center.z);
    }

    controls.update();
  };

  // Handle Raycasting to pick any CAD face directly with mouse click
  const handlePointerDown = (e: React.PointerEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const distMoved = Math.hypot(e.clientX - mouseDownPos.current.x, e.clientY - mouseDownPos.current.y);
    if (distMoved > 5) return; // Drag / rotate, not a click

    if (!isPickFaceMode || !onFacePicked || !containerRef.current || !cameraRef.current || !modelGroupRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const meshes: THREE.Mesh[] = [];
    modelGroupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });

    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0 && intersects[0].face) {
      const hit = intersects[0];
      const normal = hit.face!.normal.clone();
      normal.transformDirection(hit.object.matrixWorld);

      onFacePicked({
        x: normal.x,
        y: normal.y,
        z: normal.z,
      });
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const takeScreenshot = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${model.name.replace(/\.[^/.]+$/, '')}_bounding_box.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className={`relative flex-1 h-full w-full min-h-0 min-w-0 bg-slate-950 overflow-hidden outline-none select-none touch-none ${
        isPickFaceMode ? 'cursor-crosshair' : 'cursor-grab'
      }`}
    >
      {/* Top Floating Viewport Toolbar */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-1 sm:gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 sm:p-1.5 shadow-xl text-xs max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar">
        <button
          onClick={() => setView('iso')}
          className="px-2 sm:px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium cursor-pointer shrink-0"
          title="Góc nhìn phối cảnh 3D Isometric"
        >
          ISO
        </button>
        <button
          onClick={() => setView('top')}
          className="px-2 sm:px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium cursor-pointer shrink-0"
          title="Nhìn từ trên (Top View)"
        >
          Trên
        </button>
        <button
          onClick={() => setView('front')}
          className="px-2 sm:px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium cursor-pointer shrink-0"
          title="Nhìn chính diện (Front View)"
        >
          Trước
        </button>
        <button
          onClick={() => setView('right')}
          className="px-2 sm:px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium cursor-pointer shrink-0"
          title="Nhìn từ bên phải (Right View)"
        >
          Cạnh
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-0.5 sm:mx-1 shrink-0" />

        {/* Pick face mode button */}
        <button
          onClick={() => setIsPickFaceMode(!isPickFaceMode)}
          className={`px-2 sm:px-2.5 py-1 rounded-lg transition-colors font-semibold flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0 ${
            isPickFaceMode
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent'
          }`}
          title="Bật/Tắt chế độ Click trực tiếp lên bất kỳ mặt nào trên mô hình để căn hộp bao bám sát mặt đó"
        >
          <MousePointerClick className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Click chọn mặt ({isPickFaceMode ? 'Bật' : 'Tắt'})</span>
          <span className="sm:hidden">Chọn mặt</span>
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-0.5 sm:mx-1 shrink-0" />

        <button
          onClick={fitCameraToObject}
          className="p-1 sm:p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Căn giữa mô hình (Fit view)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-1 sm:p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            autoRotate
              ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-800'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Tự động xoay mô hình (Auto-rotate turntable)"
        >
          {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => setShowDimensions(!showDimensions)}
          className={`p-1 sm:p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            showDimensions
              ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Bật/Tắt thước đo kích thước 3D trực tiếp trên các cạnh"
        >
          <Ruler className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-1 sm:p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            showGrid
              ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-800'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Bật/Tắt lưới tọa độ mặt đất"
        >
          <Grid className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={takeScreenshot}
          className="p-1 sm:p-1.5 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Chụp ảnh màn hình 3D (PNG)"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-1 sm:p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Toàn màn hình"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Bottom Floating Dimension HUD Badge */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:bottom-4 sm:left-4 z-10 flex flex-col gap-2.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl text-xs max-w-[calc(100%-1.5rem)] sm:max-w-xl">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {showOBB && (() => {
            const currentOBB = activeOBB || model.obb;
            const hasOffset = !!(activeOBB && (activeOBB.size.x !== model.obb.size.x || activeOBB.size.y !== model.obb.size.y || activeOBB.size.z !== model.obb.size.z));
            return (
              <div className={`flex items-center gap-2 ${showAABB ? 'pr-2.5 sm:pr-3 border-r border-slate-700/60' : ''}`}>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span>
                      {hasOffset ? 'OBB BÙ TRỪ VÁCH' : 'OBB THÔNG MINH'}:
                    </span>
                  </span>
                  <span className="font-mono text-white font-bold text-xs sm:text-sm">
                    {formatDim(currentOBB.dimensions.length)} × {formatDim(currentOBB.dimensions.width)} × {formatDim(currentOBB.dimensions.height)} mm
                  </span>
                </div>
              </div>
            );
          })()}

          {showAABB && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] sm:text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                  AABB (Mặc định XYZ):
                </span>
                <span className="font-mono text-white font-bold text-xs sm:text-sm">
                  {formatDim(model.aabb.dimensions.length)} × {formatDim(model.aabb.dimensions.width)} × {formatDim(model.aabb.dimensions.height)} mm
                </span>
              </div>
            </div>
          )}

          {!showOBB && !showAABB && (
            <span className="text-slate-400 text-xs italic">
              Cả 2 khung dây Bounding Box đang tắt. Bật trong bảng điều khiển để xem.
            </span>
          )}
        </div>

        {/* Mobile/Tablet button to open Sidebar Drawer */}
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="lg:hidden w-full pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer active:opacity-75 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chỉnh Bù Trừ Vách / Khay & Xuất CAD</span>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-400" />
          </button>
        )}
      </div>

      {/* Orbit Navigation & Click Hint */}
      <div className="absolute bottom-4 right-4 z-10 text-[11px] text-slate-400 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 pointer-events-none hidden md:flex items-center gap-2">
        <span className="text-emerald-400 font-bold">Mẹo:</span>
        <span>Click trực tiếp vào mặt bất kỳ trên chi tiết để căn hộp bao bám sát mặt đó!</span>
      </div>
    </div>
  );
};
