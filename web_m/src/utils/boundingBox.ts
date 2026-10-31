import {
  AABBResult,
  OBBResult,
  Vector3D,
  BoundingBoxDimensions,
  OBBStrategy,
  OBBStrategyOption,
  CADPlanarFace,
  OBBFaceOffsets,
} from './types';

export function computeAABB(positions: Float32Array): AABBResult {
  if (positions.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
      center: { x: 0, y: 0, z: 0 },
      size: { x: 0, y: 0, z: 0 },
      dimensions: { length: 0, width: 0, height: 0, rawX: 0, rawY: 0, rawZ: 0 },
      volume: 0,
    };
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  const rawX = maxX - minX;
  const rawY = maxY - minY;
  const rawZ = maxZ - minZ;

  const sorted = [rawX, rawY, rawZ].sort((a, b) => b - a);
  const volume = rawX * rawY * rawZ;

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: (minZ + maxZ) / 2,
    },
    size: { x: rawX, y: rawY, z: rawZ },
    dimensions: {
      length: sorted[0],
      width: sorted[1],
      height: sorted[2],
      rawX,
      rawY,
      rawZ,
    },
    volume,
  };
}

function dot(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v: Vector3D): Vector3D {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len < 1e-12) return { x: 1, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function jacobi3x3(A: number[][]): { eigenvalues: number[]; eigenvectors: Vector3D[] } {
  let V = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  let matrix = [
    [A[0][0], A[0][1], A[0][2]],
    [A[1][0], A[1][1], A[1][2]],
    [A[2][0], A[2][1], A[2][2]],
  ];

  for (let iter = 0; iter < 50; iter++) {
    let maxVal = 0;
    let p = 0;
    let q = 1;

    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const absVal = Math.abs(matrix[i][j]);
        if (absVal > maxVal) {
          maxVal = absVal;
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < 1e-12) break;

    const app = matrix[p][p];
    const aqq = matrix[q][q];
    const apq = matrix[p][q];

    const theta = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    matrix[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    matrix[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    matrix[p][q] = 0;
    matrix[q][p] = 0;

    for (let k = 0; k < 3; k++) {
      if (k !== p && k !== q) {
        const akp = matrix[k][p];
        const akq = matrix[k][q];
        matrix[k][p] = c * akp - s * akq;
        matrix[p][k] = matrix[k][p];
        matrix[k][q] = s * akp + c * akq;
        matrix[q][k] = matrix[k][q];
      }
    }

    for (let k = 0; k < 3; k++) {
      const vkp = V[k][p];
      const vkq = V[k][q];
      V[k][p] = c * vkp - s * vkq;
      V[k][q] = s * vkp + c * vkq;
    }
  }

  const eigenvalues = [matrix[0][0], matrix[1][1], matrix[2][2]];
  const eigenvectors: Vector3D[] = [
    normalize({ x: V[0][0], y: V[1][0], z: V[2][0] }),
    normalize({ x: V[0][1], y: V[1][1], z: V[2][1] }),
    normalize({ x: V[0][2], y: V[1][2], z: V[2][2] }),
  ];

  return { eigenvalues, eigenvectors };
}

export function projectPointsToBasis(
  positions: Float32Array,
  centroid: Vector3D,
  u: Vector3D,
  v: Vector3D,
  w: Vector3D
) {
  let minU = Infinity, maxU = -Infinity;
  let minV = Infinity, maxV = -Infinity;
  let minW = Infinity, maxW = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const dx = positions[i] - centroid.x;
    const dy = positions[i + 1] - centroid.y;
    const dz = positions[i + 2] - centroid.z;

    const pu = dx * u.x + dy * u.y + dz * u.z;
    const pv = dx * v.x + dy * v.y + dz * v.z;
    const pw = dx * w.x + dy * w.y + dz * w.z;

    if (pu < minU) minU = pu;
    if (pu > maxU) maxU = pu;
    if (pv < minV) minV = pv;
    if (pv > maxV) maxV = pv;
    if (pw < minW) minW = pw;
    if (pw > maxW) maxW = pw;
  }

  const sizeU = maxU - minU;
  const sizeV = maxV - minV;
  const sizeW = maxW - minW;

  const centerU = (minU + maxU) / 2;
  const centerV = (minV + maxV) / 2;
  const centerW = (minW + maxW) / 2;

  const center: Vector3D = {
    x: centroid.x + centerU * u.x + centerV * v.x + centerW * w.x,
    y: centroid.y + centerU * u.y + centerV * v.y + centerW * w.y,
    z: centroid.z + centerU * u.z + centerV * v.z + centerW * w.z,
  };

  const volume = sizeU * sizeV * sizeW;

  return { u, v, w, sizeU, sizeV, sizeW, center, volume };
}

/**
 * Extracts planar faces and groups them by normal vector, sorted by surface area descending
 */
export function extractPlanarFaces(positions: Float32Array, indices: Uint32Array): CADPlanarFace[] {
  const groups: { normal: Vector3D; area: number; triangleCount: number }[] = [];

  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;

    const ax = positions[i1] - positions[i0];
    const ay = positions[i1 + 1] - positions[i0 + 1];
    const az = positions[i1 + 2] - positions[i0 + 2];

    const bx = positions[i2] - positions[i0];
    const by = positions[i2 + 1] - positions[i0 + 1];
    const bz = positions[i2 + 2] - positions[i0 + 2];

    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;

    const area2 = Math.hypot(cx, cy, cz);
    if (area2 < 1e-6) continue;
    const area = 0.5 * area2;

    const norm: Vector3D = {
      x: cx / area2,
      y: cy / area2,
      z: cz / area2,
    };

    let matched = false;
    for (const g of groups) {
      // Normal alignment (up to parallel/anti-parallel for bilateral planes)
      const d = Math.abs(dot(norm, g.normal));
      if (d > 0.985) {
        g.area += area;
        g.triangleCount++;
        matched = true;
        break;
      }
    }

    if (!matched) {
      groups.push({ normal: norm, area, triangleCount: 1 });
    }
  }

  groups.sort((a, b) => b.area - a.area);

  return groups.map((g, idx) => ({
    id: idx + 1,
    normal: g.normal,
    area: Math.round(g.area * 10) / 10,
    triangleCount: g.triangleCount,
    description: `Mặt phẳng #${idx + 1} (${Math.round(g.area)} mm²)`,
  }));
}

/**
 * Helper to get in-plane base axes (baseU, baseV) for any normal vector
 */
export function getBaseAxesForNormal(normal: Vector3D): { baseU: Vector3D; baseV: Vector3D } {
  let baseU: Vector3D;
  if (Math.abs(normal.y) > 0.8) {
    baseU = normalize(cross(normal, { x: 0, y: 0, z: 1 }));
  } else {
    baseU = normalize(cross(normal, { x: 0, y: 1, z: 0 }));
  }
  const baseV = normalize(cross(normal, baseU));
  return { baseU, baseV };
}

export function computeOBBAtAngle(
  positions: Float32Array,
  normalAxis: Vector3D,
  baseU: Vector3D,
  baseV: Vector3D,
  angleDeg: number,
  strategy: OBBStrategy = 'custom',
  availableStrategies: OBBStrategyOption[] = [],
  selectedFaceId: number | null = null
): OBBResult {
  const vertexCount = positions.length / 3;
  let sumX = 0, sumY = 0, sumZ = 0;
  for (let i = 0; i < positions.length; i += 3) {
    sumX += positions[i];
    sumY += positions[i + 1];
    sumZ += positions[i + 2];
  }
  const centroid: Vector3D = {
    x: sumX / vertexCount,
    y: sumY / vertexCount,
    z: sumZ / vertexCount,
  };

  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  const u: Vector3D = normalize({
    x: cosA * baseU.x - sinA * baseV.x,
    y: cosA * baseU.y - sinA * baseV.y,
    z: cosA * baseU.z - sinA * baseV.z,
  });

  const v: Vector3D = normalize({
    x: sinA * baseU.x + cosA * baseV.x,
    y: sinA * baseU.y + cosA * baseV.y,
    z: sinA * baseU.z + cosA * baseV.z,
  });

  const w: Vector3D = normalAxis;

  const fit = projectPointsToBasis(positions, centroid, u, v, w);

  const extents = [
    { size: fit.sizeU, vector: fit.u },
    { size: fit.sizeV, vector: fit.v },
    { size: fit.sizeW, vector: fit.w },
  ];
  extents.sort((a, b) => b.size - a.size);

  const finalU = extents[0].vector;
  const finalV = extents[1].vector;
  let finalW = normalize(cross(finalU, finalV));
  if (dot(finalW, extents[2].vector) < 0) {
    finalW = { x: -finalW.x, y: -finalW.y, z: -finalW.z };
  }

  const finalSize: Vector3D = {
    x: extents[0].size,
    y: extents[1].size,
    z: extents[2].size,
  };

  const halfSizes: Vector3D = {
    x: finalSize.x / 2,
    y: finalSize.y / 2,
    z: finalSize.z / 2,
  };

  const corners: Vector3D[] = [];
  const signs = [
    [-1, -1, -1],
    [ 1, -1, -1],
    [ 1,  1, -1],
    [-1,  1, -1],
    [-1, -1,  1],
    [ 1, -1,  1],
    [ 1,  1,  1],
    [-1,  1,  1],
  ];

  for (const [sx, sy, sz] of signs) {
    corners.push({
      x: fit.center.x + sx * halfSizes.x * finalU.x + sy * halfSizes.y * finalV.x + sz * halfSizes.z * finalW.x,
      y: fit.center.y + sx * halfSizes.x * finalU.y + sy * halfSizes.y * finalV.y + sz * halfSizes.z * finalW.y,
      z: fit.center.z + sx * halfSizes.x * finalU.z + sy * halfSizes.y * finalV.z + sz * halfSizes.z * finalW.z,
    });
  }

  const rotationMatrix = [
    finalU.x, finalV.x, finalW.x,
    finalU.y, finalV.y, finalW.y,
    finalU.z, finalV.z, finalW.z,
  ];

  const dimensions: BoundingBoxDimensions = {
    length: finalSize.x,
    width: finalSize.y,
    height: finalSize.z,
    rawX: finalSize.x,
    rawY: finalSize.y,
    rawZ: finalSize.z,
  };

  return {
    center: fit.center,
    halfSizes,
    size: finalSize,
    axes: [finalU, finalV, finalW],
    rotationMatrix,
    dimensions,
    volume: fit.volume,
    corners,
    angleDeg: Math.round(angleDeg * 10) / 10,
    strategy,
    availableStrategies,
    normalAxis,
    baseU,
    baseV,
    selectedFaceId,
  };
}

/**
 * Intelligent OBB for any candidate face normal (with optimal in-plane minimum area angle)
 */
export function computeOBBForFaceNormal(
  positions: Float32Array,
  normal: Vector3D,
  faceId: number | null = null,
  angleDeg: number | null = null
): OBBResult {
  const { baseU, baseV } = getBaseAxesForNormal(normal);

  // If angle is not specified, scan 0..180 to find minimum area on this face plane
  let bestAngle = 0;
  if (angleDeg !== null) {
    bestAngle = angleDeg;
  } else {
    let minArea = Infinity;
    const vertexCount = positions.length / 3;
    let sumX = 0, sumY = 0, sumZ = 0;
    for (let i = 0; i < positions.length; i += 3) {
      sumX += positions[i];
      sumY += positions[i + 1];
      sumZ += positions[i + 2];
    }
    const centroid: Vector3D = {
      x: sumX / vertexCount,
      y: sumY / vertexCount,
      z: sumZ / vertexCount,
    };

    for (let deg = 0; deg < 180; deg += 1) {
      const rad = (deg * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);

      const u: Vector3D = {
        x: cosA * baseU.x - sinA * baseV.x,
        y: cosA * baseU.y - sinA * baseV.y,
        z: cosA * baseU.z - sinA * baseV.z,
      };
      const v: Vector3D = {
        x: sinA * baseU.x + cosA * baseV.x,
        y: sinA * baseU.y + cosA * baseV.y,
        z: sinA * baseU.z + cosA * baseV.z,
      };

      const fit = projectPointsToBasis(positions, centroid, u, v, normal);
      if (fit.volume < minArea) {
        minArea = fit.volume;
        bestAngle = deg;
      }
    }
  }

  return computeOBBAtAngle(
    positions,
    normal,
    baseU,
    baseV,
    bestAngle,
    'face_aligned',
    [],
    faceId
  );
}

/**
 * Global Intelligent Multi-Strategy OBB Engine (tests PCA, Max Reach, and Dominant Planar Faces)
 */
export function computeOBB(
  positions: Float32Array,
  planarFaces: CADPlanarFace[] = []
): OBBResult {
  const vertexCount = positions.length / 3;

  if (vertexCount === 0) {
    return {
      center: { x: 0, y: 0, z: 0 },
      halfSizes: { x: 0, y: 0, z: 0 },
      size: { x: 0, y: 0, z: 0 },
      axes: [
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 },
      ],
      rotationMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      dimensions: { length: 0, width: 0, height: 0, rawX: 0, rawY: 0, rawZ: 0 },
      volume: 0,
      corners: [],
      angleDeg: 0,
      strategy: 'min_volume',
      availableStrategies: [],
      normalAxis: { x: 0, y: 1, z: 0 },
      baseU: { x: 1, y: 0, z: 0 },
      baseV: { x: 0, y: 0, z: 1 },
    };
  }

  let sumX = 0, sumY = 0, sumZ = 0;
  for (let i = 0; i < positions.length; i += 3) {
    sumX += positions[i];
    sumY += positions[i + 1];
    sumZ += positions[i + 2];
  }
  const centroid: Vector3D = {
    x: sumX / vertexCount,
    y: sumY / vertexCount,
    z: sumZ / vertexCount,
  };

  // 1. PCA Covariance Analysis
  let c00 = 0, c11 = 0, c22 = 0;
  let c01 = 0, c02 = 0, c12 = 0;

  for (let i = 0; i < positions.length; i += 3) {
    const dx = positions[i] - centroid.x;
    const dy = positions[i + 1] - centroid.y;
    const dz = positions[i + 2] - centroid.z;

    c00 += dx * dx;
    c11 += dy * dy;
    c22 += dz * dz;
    c01 += dx * dy;
    c02 += dx * dz;
    c12 += dy * dz;
  }

  const cov: number[][] = [
    [c00 / vertexCount, c01 / vertexCount, c02 / vertexCount],
    [c01 / vertexCount, c11 / vertexCount, c12 / vertexCount],
    [c02 / vertexCount, c12 / vertexCount, c22 / vertexCount],
  ];

  const { eigenvalues, eigenvectors } = jacobi3x3(cov);
  const sortedIndices = [0, 1, 2].sort((a, b) => eigenvalues[b] - eigenvalues[a]);
  const primaryU = eigenvectors[sortedIndices[0]];
  const primaryV = eigenvectors[sortedIndices[1]];
  const primaryW = eigenvectors[sortedIndices[2]];

  // 2. Candidate Normal Axes:
  // Collect candidate normals: PCA shortest axis + largest planar face normals + standard XYZ
  const candidateNormals: Vector3D[] = [primaryW, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 }];
  if (planarFaces && planarFaces.length > 0) {
    for (const f of planarFaces.slice(0, 12)) {
      candidateNormals.push(f.normal);
    }
  }

  // Filter unique normals
  const uniqueNormals: Vector3D[] = [];
  for (const n of candidateNormals) {
    const normalized = normalize(n);
    let exists = false;
    for (const u of uniqueNormals) {
      if (Math.abs(dot(normalized, u)) > 0.985) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      uniqueNormals.push(normalized);
    }
  }

  // 3. Scan all candidate normals to find the True Global 3D Minimum Volume Bounding Box
  let globalMinVol = Infinity;
  let bestNormal = primaryW;
  let bestBaseU: Vector3D;
  let bestBaseV: Vector3D;
  let bestAngle = 0;

  for (const candNorm of uniqueNormals) {
    const { baseU, baseV } = getBaseAxesForNormal(candNorm);

    for (let deg = 0; deg < 180; deg += 1) {
      const rad = (deg * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);

      const u: Vector3D = {
        x: cosA * baseU.x - sinA * baseV.x,
        y: cosA * baseU.y - sinA * baseV.y,
        z: cosA * baseU.z - sinA * baseV.z,
      };
      const v: Vector3D = {
        x: sinA * baseU.x + cosA * baseV.x,
        y: sinA * baseU.y + cosA * baseV.y,
        z: sinA * baseU.z + cosA * baseV.z,
      };

      const fit = projectPointsToBasis(positions, centroid, u, v, candNorm);
      if (fit.volume < globalMinVol) {
        globalMinVol = fit.volume;
        bestNormal = candNorm;
        bestBaseU = baseU;
        bestBaseV = baseV;
        bestAngle = deg;
      }
    }
  }

  // Refine best angle with 0.2° step
  const { baseU, baseV } = getBaseAxesForNormal(bestNormal);
  let refinedAngle = bestAngle;
  for (let delta = -2; delta <= 2; delta += 0.2) {
    const deg = (bestAngle + delta + 180) % 180;
    const rad = (deg * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    const u: Vector3D = {
      x: cosA * baseU.x - sinA * baseV.x,
      y: cosA * baseU.y - sinA * baseV.y,
      z: cosA * baseU.z - sinA * baseV.z,
    };
    const v: Vector3D = {
      x: sinA * baseU.x + cosA * baseV.x,
      y: sinA * baseU.y + cosA * baseV.y,
      z: sinA * baseU.z + cosA * baseV.z,
    };

    const fit = projectPointsToBasis(positions, centroid, u, v, bestNormal);
    if (fit.volume < globalMinVol) {
      globalMinVol = fit.volume;
      refinedAngle = deg;
    }
  }

  // Strategy: Max Reach (Diagonal)
  let maxDist = 0;
  let furthestVector: Vector3D = { x: 1, y: 0, z: 0 };
  for (let i = 0; i < positions.length; i += 3) {
    const dx = positions[i] - centroid.x;
    const dy = positions[i + 1] - centroid.y;
    const dz = positions[i + 2] - centroid.z;

    const projU = dx * baseU.x + dy * baseU.y + dz * baseU.z;
    const projV = dx * baseV.x + dy * baseV.y + dz * baseV.z;
    const d = Math.hypot(projU, projV);
    if (d > maxDist) {
      maxDist = d;
      furthestVector = { x: projU, y: projV, z: 0 };
    }
  }
  let maxReachAngle = (Math.atan2(furthestVector.y, furthestVector.x) * 180 / Math.PI + 360) % 180;

  // Strategy: PCA Angle
  const pcaProjU = primaryU.x * baseU.x + primaryU.y * baseU.y + primaryU.z * baseU.z;
  const pcaProjV = primaryU.x * baseV.x + primaryU.y * baseV.y + primaryU.z * baseV.z;
  let pcaAngle = (Math.atan2(pcaProjV, pcaProjU) * 180 / Math.PI + 360) % 180;

  const strategyDefs = [
    {
      id: 'min_volume' as OBBStrategy,
      label: 'Tối ưu thể tích (Min Volume)',
      desc: 'Tự động quét tất cả các mặt và góc xoay để đạt thể tích bao nhỏ nhất tuyệt đối.',
      angle: refinedAngle,
    },
    {
      id: 'max_reach' as OBBStrategy,
      label: 'Trục vươn xa (Max Reach)',
      desc: 'Căn theo trục vươn xa nhất / đường nối từ tâm đến mỏm xa nhất của chi tiết.',
      angle: maxReachAngle,
    },
    {
      id: 'pca' as OBBStrategy,
      label: 'Quán tính chính (PCA)',
      desc: 'Căn theo 3 vector riêng của ma trận hiệp biến phân bố hình học.',
      angle: pcaAngle,
    },
  ];

  const availableStrategies: OBBStrategyOption[] = strategyDefs.map((s) => {
    const rad = (s.angle * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    const u = {
      x: cosA * baseU.x - sinA * baseV.x,
      y: cosA * baseU.y - sinA * baseV.y,
      z: cosA * baseU.z - sinA * baseV.z,
    };
    const v = {
      x: sinA * baseU.x + cosA * baseV.x,
      y: sinA * baseU.y + cosA * baseV.y,
      z: sinA * baseU.z + cosA * baseV.z,
    };
    const fit = projectPointsToBasis(positions, centroid, u, v, bestNormal);
    const sorted = [fit.sizeU, fit.sizeV, fit.sizeW].sort((a, b) => b - a);
    return {
      id: s.id,
      label: s.label,
      description: s.desc,
      angleDeg: Math.round(s.angle * 10) / 10,
      volume: fit.volume,
      size: { x: sorted[0], y: sorted[1], z: sorted[2] },
      dimensions: {
        length: sorted[0],
        width: sorted[1],
        height: sorted[2],
        rawX: sorted[0],
        rawY: sorted[1],
        rawZ: sorted[2],
      },
    };
  });

  return computeOBBAtAngle(
    positions,
    bestNormal,
    baseU,
    baseV,
    refinedAngle,
    'min_volume',
    availableStrategies
  );
}

export function computeModelStatistics(
  positions: Float32Array,
  indices: Uint32Array,
  aabbVolume: number,
  obbVolume: number,
  meshCount: number
) {
  let surfaceArea = 0;
  const triangleCount = indices.length / 3;

  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;

    const ax = positions[i1] - positions[i0];
    const ay = positions[i1 + 1] - positions[i0 + 1];
    const az = positions[i1 + 2] - positions[i0 + 2];

    const bx = positions[i2] - positions[i0];
    const by = positions[i2 + 1] - positions[i0 + 1];
    const bz = positions[i2 + 2] - positions[i0 + 2];

    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;

    surfaceArea += 0.5 * Math.hypot(cx, cy, cz);
  }

  const volumeRatio = aabbVolume > 0 ? obbVolume / aabbVolume : 1;

  return {
    vertexCount: positions.length / 3,
    triangleCount,
    meshCount,
    surfaceArea,
    volumeAABB: aabbVolume,
    volumeOBB: obbVolume,
    volumeRatio,
  };
}

/**
 * Computes the expanded/offset Oriented Bounding Box for tray/cavity/wall design.
 * Moves the 6 faces outward by specified margins along local principal axes.
 */
export function applyOffsetsToOBB(
  obb: OBBResult,
  offsets: OBBFaceOffsets
): OBBResult {
  const { axes, center: origCenter, halfSizes } = obb;
  const [u, v, w] = axes;

  const uniform = Math.max(0, offsets.uniform || 0);
  const extraL = Math.max(0, offsets.extraLength || 0);
  const extraW = Math.max(0, offsets.extraWidth || 0);
  const extraBottom = Math.max(0, offsets.extraBottom || 0);
  const extraTop = Math.max(0, offsets.extraTop || 0);

  // If all offsets are zero, return original OBB
  if (uniform === 0 && extraL === 0 && extraW === 0 && extraBottom === 0 && extraTop === 0) {
    return obb;
  }

  // Individual face shifts
  const offU_minus = uniform + extraL;
  const offU_plus = uniform + extraL;
  const offV_minus = uniform + extraW;
  const offV_plus = uniform + extraW;
  const offW_minus = uniform + extraBottom;
  const offW_plus = uniform + extraTop;

  // New center: shifts along w if top and bottom offsets differ
  const shiftW = (offW_plus - offW_minus) / 2;
  const center: Vector3D = {
    x: origCenter.x + shiftW * w.x,
    y: origCenter.y + shiftW * w.y,
    z: origCenter.z + shiftW * w.z,
  };

  // Half-sizes
  const newHalfX = halfSizes.x + (offU_minus + offU_plus) / 2;
  const newHalfY = halfSizes.y + (offV_minus + offV_plus) / 2;
  const newHalfZ = halfSizes.z + (offW_minus + offW_plus) / 2;

  const newSize: Vector3D = {
    x: newHalfX * 2,
    y: newHalfY * 2,
    z: newHalfZ * 2,
  };

  // 8 corners
  const signs = [
    [-1, -1, -1], // 0: -u -v -w
    [ 1, -1, -1], // 1: +u -v -w
    [ 1,  1, -1], // 2: +u +v -w
    [-1,  1, -1], // 3: -u +v -w
    [-1, -1,  1], // 4: -u -v +w
    [ 1, -1,  1], // 5: +u -v +w
    [ 1,  1,  1], // 6: +u +v +w
    [-1,  1,  1], // 7: -u +v +w
  ];

  const corners: Vector3D[] = [];
  for (const [sx, sy, sz] of signs) {
    const distU = sx > 0 ? (halfSizes.x + offU_plus) : -(halfSizes.x + offU_minus);
    const distV = sy > 0 ? (halfSizes.y + offV_plus) : -(halfSizes.y + offV_minus);
    const distW = sz > 0 ? (halfSizes.z + offW_plus) : -(halfSizes.z + offW_minus);

    corners.push({
      x: origCenter.x + distU * u.x + distV * v.x + distW * w.x,
      y: origCenter.y + distU * u.y + distV * v.y + distW * w.y,
      z: origCenter.z + distU * u.z + distV * v.z + distW * w.z,
    });
  }

  const sortedDims = [newSize.x, newSize.y, newSize.z].sort((a, b) => b - a);
  const newVolume = newSize.x * newSize.y * newSize.z;

  return {
    ...obb,
    center,
    halfSizes: { x: newHalfX, y: newHalfY, z: newHalfZ },
    size: newSize,
    corners,
    volume: newVolume,
    dimensions: {
      length: sortedDims[0],
      width: sortedDims[1],
      height: sortedDims[2],
      rawX: newSize.x,
      rawY: newSize.y,
      rawZ: newSize.z,
    },
  };
}
