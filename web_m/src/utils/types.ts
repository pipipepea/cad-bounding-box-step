export interface OcctAttribute {
  array: Float32Array | number[];
}

export interface OcctIndex {
  array: Uint32Array | Uint16Array | number[];
}

export interface OcctBrepFace {
  first: number;
  last: number;
  color?: [number, number, number];
}

export interface OcctMesh {
  name: string;
  color?: [number, number, number] | null;
  attributes: {
    position: OcctAttribute;
    normal?: OcctAttribute;
  };
  index: OcctIndex;
  brep_faces?: OcctBrepFace[];
}

export interface OcctImportResult {
  success: boolean;
  meshes: OcctMesh[];
  root?: any;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBoxDimensions {
  length: number; // Principal / longest dimension (mm)
  width: number;  // Intermediate dimension (mm)
  height: number; // Shortest dimension (mm)
  rawX: number;   // Dimension along X axis (mm)
  rawY: number;   // Dimension along Y axis (mm)
  rawZ: number;   // Dimension along Z axis (mm)
}

export interface AABBResult {
  min: Vector3D;
  max: Vector3D;
  center: Vector3D;
  size: Vector3D;
  dimensions: BoundingBoxDimensions;
  volume: number; // mm³
}

export type OBBStrategy = 'min_volume' | 'max_reach' | 'pca' | 'face_aligned' | 'custom';

export interface OBBStrategyOption {
  id: OBBStrategy;
  label: string;
  description: string;
  angleDeg: number;
  dimensions: BoundingBoxDimensions;
  volume: number;
  size: Vector3D;
}

export interface CADPlanarFace {
  id: number;
  normal: Vector3D;
  area: number; // mm²
  triangleCount: number;
  description: string;
}

export interface OBBFaceOffsets {
  uniform: number;     // Bù trừ đều mọi mặt (mm)
  extraLength: number; // Bù trừ thêm trục Dài (mỗi bên ±u: extraLength mm)
  extraWidth: number;  // Bù trừ thêm trục Rộng (mỗi bên ±v: extraWidth mm)
  extraBottom: number; // Bù trừ đáy khay (-w: extraBottom mm)
  extraTop: number;    // Bù trừ đỉnh/nắp (+w: extraTop mm)
}

export const DEFAULT_OFFSETS: OBBFaceOffsets = {
  uniform: 0,
  extraLength: 0,
  extraWidth: 0,
  extraBottom: 0,
  extraTop: 0,
};

export interface OBBResult {
  center: Vector3D;
  halfSizes: Vector3D;
  size: Vector3D;
  axes: [Vector3D, Vector3D, Vector3D];
  rotationMatrix: number[];
  dimensions: BoundingBoxDimensions;
  volume: number; // mm³
  corners: Vector3D[];
  angleDeg: number;
  strategy: OBBStrategy;
  availableStrategies: OBBStrategyOption[];
  normalAxis: Vector3D;
  baseU: Vector3D;
  baseV: Vector3D;
  selectedFaceId?: number | null;
}

export interface ModelStatistics {
  vertexCount: number;
  triangleCount: number;
  meshCount: number;
  surfaceArea: number; // mm²
  volumeAABB: number;  // mm³
  volumeOBB: number;   // mm³
  volumeRatio: number;
}

export interface ParsedCADModel {
  name: string;
  fileSize: number;
  meshes: OcctMesh[];
  aabb: AABBResult;
  obb: OBBResult;
  stats: ModelStatistics;
  planarFaces: CADPlanarFace[];
  allPositions?: Float32Array;
  allIndices?: Uint32Array;
  rawStepText?: string;
}

export type ParseStatus = 'idle' | 'reading_file' | 'loading_wasm' | 'parsing_geometry' | 'computing_bounds' | 'ready' | 'error';
