// Dedicated Classic Web Worker for OpenCascade STEP parsing and Multi-Face 3D Bounding Box calculation
importScripts('/occt-import-js.js');

let occtInstance = null;

async function getOcctInstance() {
  if (occtInstance) return occtInstance;

  postMessage({
    type: 'progress',
    step: 'Khởi tạo nhân OpenCascade WebAssembly...',
    percent: 15,
  });

  const moduleOverrides = {
    locateFile: function (path) {
      if (path.endsWith('.wasm')) {
        return '/occt-import-js.wasm';
      }
      return path;
    },
  };

  occtInstance = await self.occtimportjs(moduleOverrides);
  return occtInstance;
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v) {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len < 1e-12) return { x: 1, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function jacobi3x3(A) {
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
  const eigenvectors = [
    normalize({ x: V[0][0], y: V[1][0], z: V[2][0] }),
    normalize({ x: V[0][1], y: V[1][1], z: V[2][1] }),
    normalize({ x: V[0][2], y: V[1][2], z: V[2][2] }),
  ];

  return { eigenvalues, eigenvectors };
}

function projectPointsToBasis(positions, centroid, u, v, w) {
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

  const center = {
    x: centroid.x + centerU * u.x + centerV * v.x + centerW * w.x,
    y: centroid.y + centerU * u.y + centerV * v.y + centerW * w.y,
    z: centroid.z + centerU * u.z + centerV * v.z + centerW * w.z,
  };

  const volume = sizeU * sizeV * sizeW;

  return { u, v, w, sizeU, sizeV, sizeW, center, volume };
}

function computeAABB(positions) {
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

  const sorted = [rawX, rawY, rawZ].sort(function(a, b) { return b - a; });
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
      rawX: rawX,
      rawY: rawY,
      rawZ: rawZ,
    },
    volume: volume,
  };
}

function extractPlanarFaces(positions, indices) {
  const groups = [];

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

    const norm = {
      x: cx / area2,
      y: cy / area2,
      z: cz / area2,
    };

    let matched = false;
    for (let gIdx = 0; gIdx < groups.length; gIdx++) {
      const g = groups[gIdx];
      const d = Math.abs(dot(norm, g.normal));
      if (d > 0.985) {
        g.area += area;
        g.triangleCount++;
        matched = true;
        break;
      }
    }

    if (!matched) {
      groups.push({ normal: norm, area: area, triangleCount: 1 });
    }
  }

  groups.sort(function(a, b) { return b.area - a.area; });

  return groups.map(function(g, idx) {
    return {
      id: idx + 1,
      normal: g.normal,
      area: Math.round(g.area * 10) / 10,
      triangleCount: g.triangleCount,
      description: 'Mặt phẳng #' + (idx + 1) + ' (' + Math.round(g.area) + ' mm²)',
    };
  });
}

function getBaseAxesForNormal(normal) {
  let baseU;
  if (Math.abs(normal.y) > 0.8) {
    baseU = normalize(cross(normal, { x: 0, y: 0, z: 1 }));
  } else {
    baseU = normalize(cross(normal, { x: 0, y: 1, z: 0 }));
  }
  const baseV = normalize(cross(normal, baseU));
  return { baseU: baseU, baseV: baseV };
}

function computeOBBAtAngle(positions, normalAxis, baseU, baseV, angleDeg, strategy, availableStrategies, selectedFaceId) {
  const vertexCount = positions.length / 3;
  let sumX = 0, sumY = 0, sumZ = 0;
  for (let i = 0; i < positions.length; i += 3) {
    sumX += positions[i];
    sumY += positions[i + 1];
    sumZ += positions[i + 2];
  }
  const centroid = {
    x: sumX / vertexCount,
    y: sumY / vertexCount,
    z: sumZ / vertexCount,
  };

  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  const u = normalize({
    x: cosA * baseU.x - sinA * baseV.x,
    y: cosA * baseU.y - sinA * baseV.y,
    z: cosA * baseU.z - sinA * baseV.z,
  });

  const v = normalize({
    x: sinA * baseU.x + cosA * baseV.x,
    y: sinA * baseU.y + cosA * baseV.y,
    z: sinA * baseU.z + cosA * baseV.z,
  });

  const w = normalAxis;

  const fit = projectPointsToBasis(positions, centroid, u, v, w);

  const extents = [
    { size: fit.sizeU, vector: fit.u },
    { size: fit.sizeV, vector: fit.v },
    { size: fit.sizeW, vector: fit.w },
  ];
  extents.sort(function(a, b) { return b.size - a.size; });

  const finalU = extents[0].vector;
  const finalV = extents[1].vector;
  let finalW = normalize(cross(finalU, finalV));
  if (dot(finalW, extents[2].vector) < 0) {
    finalW = { x: -finalW.x, y: -finalW.y, z: -finalW.z };
  }

  const finalSize = {
    x: extents[0].size,
    y: extents[1].size,
    z: extents[2].size,
  };

  const halfSizes = {
    x: finalSize.x / 2,
    y: finalSize.y / 2,
    z: finalSize.z / 2,
  };

  const corners = [];
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

  for (let sIdx = 0; sIdx < signs.length; sIdx++) {
    const sx = signs[sIdx][0];
    const sy = signs[sIdx][1];
    const sz = signs[sIdx][2];
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

  const dimensions = {
    length: finalSize.x,
    width: finalSize.y,
    height: finalSize.z,
    rawX: finalSize.x,
    rawY: finalSize.y,
    rawZ: finalSize.z,
  };

  return {
    center: fit.center,
    halfSizes: halfSizes,
    size: finalSize,
    axes: [finalU, finalV, finalW],
    rotationMatrix: rotationMatrix,
    dimensions: dimensions,
    volume: fit.volume,
    corners: corners,
    angleDeg: Math.round(angleDeg * 10) / 10,
    strategy: strategy || 'custom',
    availableStrategies: availableStrategies || [],
    normalAxis: normalAxis,
    baseU: baseU,
    baseV: baseV,
    selectedFaceId: selectedFaceId || null,
  };
}

function computeOBB(positions, planarFaces) {
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
  const centroid = {
    x: sumX / vertexCount,
    y: sumY / vertexCount,
    z: sumZ / vertexCount,
  };

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

  const cov = [
    [c00 / vertexCount, c01 / vertexCount, c02 / vertexCount],
    [c01 / vertexCount, c11 / vertexCount, c12 / vertexCount],
    [c02 / vertexCount, c12 / vertexCount, c22 / vertexCount],
  ];

  const { eigenvalues, eigenvectors } = jacobi3x3(cov);

  const sortedIndices = [0, 1, 2].sort(function(a, b) { return eigenvalues[b] - eigenvalues[a]; });
  const primaryU = eigenvectors[sortedIndices[0]];
  const primaryV = eigenvectors[sortedIndices[1]];
  const primaryW = eigenvectors[sortedIndices[2]];

  const candidateNormals = [primaryW, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 }];
  if (planarFaces && planarFaces.length > 0) {
    for (let fIdx = 0; fIdx < Math.min(planarFaces.length, 12); fIdx++) {
      candidateNormals.push(planarFaces[fIdx].normal);
    }
  }

  const uniqueNormals = [];
  for (let nIdx = 0; nIdx < candidateNormals.length; nIdx++) {
    const candNorm = normalize(candidateNormals[nIdx]);
    let exists = false;
    for (let uIdx = 0; uIdx < uniqueNormals.length; uIdx++) {
      if (Math.abs(dot(candNorm, uniqueNormals[uIdx])) > 0.985) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      uniqueNormals.push(candNorm);
    }
  }

  let globalMinVol = Infinity;
  let bestNormal = primaryW;
  let bestBaseU = { x: 1, y: 0, z: 0 };
  let bestBaseV = { x: 0, y: 0, z: 1 };
  let bestAngle = 0;

  for (let nIdx = 0; nIdx < uniqueNormals.length; nIdx++) {
    const candNorm = uniqueNormals[nIdx];
    const axes = getBaseAxesForNormal(candNorm);

    for (let deg = 0; deg < 180; deg += 1) {
      const rad = (deg * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);

      const u = {
        x: cosA * axes.baseU.x - sinA * axes.baseV.x,
        y: cosA * axes.baseU.y - sinA * axes.baseV.y,
        z: cosA * axes.baseU.z - sinA * axes.baseV.z,
      };
      const v = {
        x: sinA * axes.baseU.x + cosA * axes.baseV.x,
        y: sinA * axes.baseU.y + cosA * axes.baseV.y,
        z: sinA * axes.baseU.z + cosA * axes.baseV.z,
      };

      const fit = projectPointsToBasis(positions, centroid, u, v, candNorm);
      if (fit.volume < globalMinVol) {
        globalMinVol = fit.volume;
        bestNormal = candNorm;
        bestBaseU = axes.baseU;
        bestBaseV = axes.baseV;
        bestAngle = deg;
      }
    }
  }

  const optAxes = getBaseAxesForNormal(bestNormal);
  const baseU = optAxes.baseU;
  const baseV = optAxes.baseV;

  let refinedAngle = bestAngle;
  for (let delta = -2; delta <= 2; delta += 0.2) {
    const deg = (bestAngle + delta + 180) % 180;
    const rad = (deg * Math.PI) / 180;
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
    if (fit.volume < globalMinVol) {
      globalMinVol = fit.volume;
      refinedAngle = deg;
    }
  }

  // Strategy: Max Reach
  let maxDist = 0;
  let furthestVector = { x: 1, y: 0, z: 0 };
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
      id: 'min_volume',
      label: 'Tối ưu thể tích (Min Volume)',
      desc: 'Tự động quét tất cả các mặt phẳng và góc xoay để đạt thể tích bao nhỏ nhất tuyệt đối.',
      angle: refinedAngle,
    },
    {
      id: 'max_reach',
      label: 'Trục vươn xa (Max Reach)',
      desc: 'Căn theo trục vươn xa nhất / đường nối từ tâm đến mỏm xa nhất của chi tiết.',
      angle: maxReachAngle,
    },
    {
      id: 'pca',
      label: 'Quán tính chính (PCA)',
      desc: 'Căn theo 3 vector riêng của ma trận hiệp biến phân bố hình học.',
      angle: pcaAngle,
    },
  ];

  const availableStrategies = strategyDefs.map(function(s) {
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
    const sorted = [fit.sizeU, fit.sizeV, fit.sizeW].sort(function(a, b) { return b - a; });
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
    availableStrategies,
    null
  );
}

function computeModelStatistics(positions, indices, aabbVolume, obbVolume, meshCount) {
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
    triangleCount: triangleCount,
    meshCount: meshCount,
    surfaceArea: surfaceArea,
    volumeAABB: aabbVolume,
    volumeOBB: obbVolume,
    volumeRatio: volumeRatio,
  };
}

self.onmessage = async function (e) {
  const { action, buffer, fileName, fileSize } = e.data;
  if (action !== 'parse') return;

  try {
    postMessage({
      type: 'progress',
      step: 'Đang tải nhân OpenCascade CAD...',
      percent: 10,
    });

    const occt = await getOcctInstance();

    postMessage({
      type: 'progress',
      step: 'Đang phân tích cấu trúc 3D hình học CAD (B-Rep)...',
      percent: 40,
    });

    const fileBuffer = new Uint8Array(buffer);
    const result = occt.ReadStepFile(fileBuffer, null);

    if (!result || !result.success || !result.meshes || result.meshes.length === 0) {
      postMessage({
        type: 'error',
        error: 'Không thể phân tích file STEP hoặc file không chứa khối hình học 3D hợp lệ.',
      });
      return;
    }

    postMessage({
      type: 'progress',
      step: 'Đang trích xuất các mặt phẳng & tính toán phủ bì 3D...',
      percent: 75,
    });

    const meshes = result.meshes;

    let totalCoords = 0;
    let totalIndices = 0;
    for (let i = 0; i < meshes.length; i++) {
      const m = meshes[i];
      if (m.attributes && m.attributes.position && m.attributes.position.array) {
        totalCoords += m.attributes.position.array.length;
      }
      if (m.index && m.index.array) {
        totalIndices += m.index.array.length;
      }
    }

    const allPositions = new Float32Array(totalCoords);
    const allIndices = new Uint32Array(totalIndices);

    let posOffset = 0;
    let indexOffset = 0;
    let vertexOffset = 0;

    for (let i = 0; i < meshes.length; i++) {
      const m = meshes[i];
      const pos = m.attributes.position.array;
      const idx = m.index.array;
      if (!pos || pos.length === 0) continue;

      const posF32 = pos instanceof Float32Array ? pos : new Float32Array(pos);
      allPositions.set(posF32, posOffset);

      const idxU32 = Uint32Array.from(idx);
      for (let k = 0; k < idxU32.length; k++) {
        allIndices[indexOffset + k] = idxU32[k] + vertexOffset;
      }

      posOffset += posF32.length;
      indexOffset += idxU32.length;
      vertexOffset += posF32.length / 3;
    }

    // Extract Planar Faces (groups of triangles with same normal)
    const planarFaces = extractPlanarFaces(allPositions, allIndices);

    const aabb = computeAABB(allPositions);
    const obb = computeOBB(allPositions, planarFaces);
    const stats = computeModelStatistics(
      allPositions,
      allIndices,
      aabb.volume,
      obb.volume,
      meshes.length
    );

    postMessage({
      type: 'progress',
      step: 'Hoàn tất đo đạc!',
      percent: 100,
    });

    postMessage({
      type: 'success',
      result: {
        name: fileName,
        fileSize: fileSize,
        meshes: meshes,
        aabb: aabb,
        obb: obb,
        stats: stats,
        planarFaces: planarFaces,
        allPositions: allPositions,
        allIndices: allIndices,
      },
    });
  } catch (err) {
    postMessage({
      type: 'error',
      error: 'Lỗi xử lý file STEP: ' + (err && err.message ? err.message : err),
    });
  }
};
