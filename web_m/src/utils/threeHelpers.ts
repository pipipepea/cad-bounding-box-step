import * as THREE from 'three';
import { OcctMesh, AABBResult, OBBResult } from './types';

/**
 * Builds Three.js Group from parsed OCCT meshes
 */
export function buildCADSceneObject(meshes: OcctMesh[], showEdges: boolean = true): {
  group: THREE.Group;
  allPositions: Float32Array;
  allIndices: Uint32Array;
} {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'CAD_Root_Model';

  let totalPositions = 0;
  let totalIndices = 0;

  for (const m of meshes) {
    if (m.attributes?.position?.array) {
      totalPositions += m.attributes.position.array.length;
    }
    if (m.index?.array) {
      totalIndices += m.index.array.length;
    }
  }

  const combinedPositions = new Float32Array(totalPositions);
  const combinedIndices = new Uint32Array(totalIndices);

  let posOffset = 0;
  let indexOffset = 0;
  let vertexOffset = 0;

  for (let mIdx = 0; mIdx < meshes.length; mIdx++) {
    const meshData = meshes[mIdx];
    const posArr = meshData.attributes.position.array;
    const idxArr = meshData.index.array;

    if (!posArr || posArr.length === 0) continue;

    const geometry = new THREE.BufferGeometry();
    const posFloat32 = posArr instanceof Float32Array ? posArr : new Float32Array(posArr);
    geometry.setAttribute('position', new THREE.BufferAttribute(posFloat32, 3));

    combinedPositions.set(posFloat32, posOffset);

    if (meshData.attributes.normal?.array) {
      const normFloat32 =
        meshData.attributes.normal.array instanceof Float32Array
          ? meshData.attributes.normal.array
          : new Float32Array(meshData.attributes.normal.array);
      geometry.setAttribute('normal', new THREE.BufferAttribute(normFloat32, 3));
    } else {
      geometry.computeVertexNormals();
    }

    const indicesUint32 = Uint32Array.from(idxArr);
    geometry.setIndex(new THREE.BufferAttribute(indicesUint32, 1));

    for (let k = 0; k < indicesUint32.length; k++) {
      combinedIndices[indexOffset + k] = indicesUint32[k] + vertexOffset;
    }

    posOffset += posFloat32.length;
    indexOffset += indicesUint32.length;
    vertexOffset += posFloat32.length / 3;

    const defaultColor = meshData.color
      ? new THREE.Color(meshData.color[0], meshData.color[1], meshData.color[2])
      : new THREE.Color('#94a3b8');

    const defaultMaterial = new THREE.MeshStandardMaterial({
      color: defaultColor,
      roughness: 0.35,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });

    const materials: THREE.Material[] = [defaultMaterial];

    if (meshData.brep_faces && meshData.brep_faces.length > 0) {
      for (const face of meshData.brep_faces) {
        const color = face.color
          ? new THREE.Color(face.color[0], face.color[1], face.color[2])
          : defaultColor;
        materials.push(
          new THREE.MeshStandardMaterial({
            color,
            roughness: 0.35,
            metalness: 0.15,
            side: THREE.DoubleSide,
          })
        );
      }

      const triangleCount = indicesUint32.length / 3;
      let triangleIndex = 0;
      let faceGroupIndex = 0;

      while (triangleIndex < triangleCount) {
        const firstIndex = triangleIndex;
        let lastIndex = triangleCount;
        let materialIndex = 0;

        if (faceGroupIndex < meshData.brep_faces.length) {
          const currentFace = meshData.brep_faces[faceGroupIndex];
          if (triangleIndex < currentFace.first) {
            lastIndex = currentFace.first;
            materialIndex = 0;
          } else {
            lastIndex = currentFace.last + 1;
            materialIndex = faceGroupIndex + 1;
            faceGroupIndex++;
          }
        }

        geometry.addGroup(firstIndex * 3, (lastIndex - firstIndex) * 3, materialIndex);
        triangleIndex = lastIndex;
      }
    }

    const mesh = new THREE.Mesh(geometry, materials.length > 1 ? materials : materials[0]);
    mesh.name = meshData.name || `CAD_Mesh_${mIdx}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);

    if (showEdges) {
      const edgesGeom = new THREE.EdgesGeometry(geometry, 28);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x1e293b,
        linewidth: 1,
        transparent: true,
        opacity: 0.7,
      });
      const edges = new THREE.LineSegments(edgesGeom, edgeMaterial);
      edges.renderOrder = 1;
      rootGroup.add(edges);
    }
  }

  return {
    group: rootGroup,
    allPositions: combinedPositions,
    allIndices: combinedIndices,
  };
}

/**
 * Creates dimension text sprite
 */
function createDimensionSprite(text: string, color = '#10b981', scale = 10): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 304, 64, 16);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.font = 'bold 28px Consolas, monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 160, 40);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    transparent: true,
  });

  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(scale * 1.6, scale * 0.4, 1);
  sprite.renderOrder = 99;
  return sprite;
}

/**
 * Creates visual AABB wireframe box
 */
export function createAABBVisualizer(aabb: AABBResult): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Visualizer_AABB';

  const { min, max, center, size } = aabb;
  if (size.x <= 0 || size.y <= 0 || size.z <= 0) return group;

  const boxGeom = new THREE.BoxGeometry(size.x, size.y, size.z);
  const edgesGeom = new THREE.EdgesGeometry(boxGeom);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    linewidth: 2,
    transparent: true,
    opacity: 0.9,
  });

  const wireframe = new THREE.LineSegments(edgesGeom, lineMaterial);
  wireframe.position.set(center.x, center.y, center.z);
  group.add(wireframe);

  const cornerGeom = new THREE.SphereGeometry(Math.max(size.x, size.y, size.z) * 0.008, 8, 8);
  const cornerMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });

  const cornerCoords = [
    [min.x, min.y, min.z],
    [max.x, min.y, min.z],
    [max.x, max.y, min.z],
    [min.x, max.y, min.z],
    [min.x, min.y, max.z],
    [max.x, min.y, max.z],
    [max.x, max.y, max.z],
    [min.x, max.y, max.z],
  ];

  for (const [x, y, z] of cornerCoords) {
    const sphere = new THREE.Mesh(cornerGeom, cornerMat);
    sphere.position.set(x, y, z);
    group.add(sphere);
  }

  const faceMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.04,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const faceMesh = new THREE.Mesh(boxGeom, faceMat);
  faceMesh.position.set(center.x, center.y, center.z);
  group.add(faceMesh);

  return group;
}

/**
 * Creates visual OBB wireframe box with smart dimension leader lines and callouts.
 * If baseOBB is provided (when face offsets are applied), renders both the original part boundary
 * and the expanded tray/vách cavity box.
 */
export function createOBBVisualizer(
  obb: OBBResult,
  showDimensions = true,
  baseOBB?: OBBResult | null
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Visualizer_OBB';

  const { center, size, axes, corners, dimensions } = obb;
  if (!corners || corners.length < 8) return group;

  // 12 edges indices
  const edgeIndices = [
    [0, 1], [1, 2], [2, 3], [3, 0], // Bottom face
    [4, 5], [5, 6], [6, 7], [7, 4], // Top face
    [0, 4], [1, 5], [2, 6], [3, 7], // Vertical edges
  ];

  const hasOffset = !!(baseOBB && (baseOBB.size.x !== size.x || baseOBB.size.y !== size.y || baseOBB.size.z !== size.z));

  // If offset is active, draw the inner original boundary in subtle cyan/slate
  if (hasOffset && baseOBB && baseOBB.corners && baseOBB.corners.length >= 8) {
    const baseLines: number[] = [];
    for (const [i0, i1] of edgeIndices) {
      const c0 = baseOBB.corners[i0];
      const c1 = baseOBB.corners[i1];
      baseLines.push(c0.x, c0.y, c0.z, c1.x, c1.y, c1.z);
    }
    const baseLineGeom = new THREE.BufferGeometry();
    baseLineGeom.setAttribute('position', new THREE.Float32BufferAttribute(baseLines, 3));
    const baseLineMat = new THREE.LineDashedMaterial({
      color: 0x06b6d4, // Cyan
      linewidth: 1.5,
      dashSize: 4,
      gapSize: 2,
      transparent: true,
      opacity: 0.6,
    });
    const baseWireframe = new THREE.LineSegments(baseLineGeom, baseLineMat);
    baseWireframe.computeLineDistances();
    group.add(baseWireframe);
  }

  // Draw main OBB (Tray / Vách box)
  const linePositions: number[] = [];
  for (const [i0, i1] of edgeIndices) {
    const c0 = corners[i0];
    const c1 = corners[i1];
    linePositions.push(c0.x, c0.y, c0.z, c1.x, c1.y, c1.z);
  }

  const lineGeom = new THREE.BufferGeometry();
  lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

  const lineMat = new THREE.LineBasicMaterial({
    color: hasOffset ? 0x10b981 : 0x10b981, // Emerald Green
    linewidth: 2.5,
    transparent: true,
    opacity: 0.95,
  });

  const wireframe = new THREE.LineSegments(lineGeom, lineMat);
  group.add(wireframe);

  // Corner markers
  const maxDim = Math.max(size.x, size.y, size.z);
  const cornerGeom = new THREE.SphereGeometry(maxDim * 0.009, 8, 8);
  const cornerMat = new THREE.MeshBasicMaterial({ color: hasOffset ? 0x059669 : 0x059669 });

  for (const c of corners) {
    const sphere = new THREE.Mesh(cornerGeom, cornerMat);
    sphere.position.set(c.x, c.y, c.z);
    group.add(sphere);
  }

  // Semi-transparent oriented faces
  const boxGeom = new THREE.BoxGeometry(size.x, size.y, size.z);
  const faceMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: hasOffset ? 0.09 : 0.06,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const faceMesh = new THREE.Mesh(boxGeom, faceMat);
  const [u, v, w] = axes;
  const rotMatrix = new THREE.Matrix4().set(
    u.x, v.x, w.x, 0,
    u.y, v.y, w.y, 0,
    u.z, v.z, w.z, 0,
    0,   0,   0,   1
  );
  faceMesh.applyMatrix4(rotMatrix);
  faceMesh.position.set(center.x, center.y, center.z);
  group.add(faceMesh);

  // 3D Dimension Callouts along 3 principal edges
  if (showDimensions) {
    const scale = maxDim * 0.12;

    const labelPrefix = hasOffset ? 'Khay: ' : '';

    // Edge 1: Length (Dài) - along axis u (between corners 0 and 1)
    const midL = {
      x: (corners[0].x + corners[1].x) / 2 + u.x * 2 - v.y * 2,
      y: (corners[0].y + corners[1].y) / 2,
      z: (corners[0].z + corners[1].z) / 2,
    };
    const spriteL = createDimensionSprite(
      `${labelPrefix}Dài ${formatDim(dimensions.length)} mm`,
      '#10b981',
      scale
    );
    spriteL.position.set(midL.x, midL.y, midL.z);
    group.add(spriteL);

    // Edge 2: Width (Rộng) - along axis v (between corners 1 and 2)
    const midW = {
      x: (corners[1].x + corners[2].x) / 2,
      y: (corners[1].y + corners[2].y) / 2,
      z: (corners[1].z + corners[2].z) / 2,
    };
    const spriteW = createDimensionSprite(
      `${labelPrefix}Rộng ${formatDim(dimensions.width)} mm`,
      '#34d399',
      scale
    );
    spriteW.position.set(midW.x, midW.y, midW.z);
    group.add(spriteW);

    // Edge 3: Height (Cao) - along axis w (between corners 1 and 5)
    const midH = {
      x: (corners[1].x + corners[5].x) / 2,
      y: (corners[1].y + corners[5].y) / 2,
      z: (corners[1].z + corners[5].z) / 2,
    };
    const spriteH = createDimensionSprite(
      `${labelPrefix}Cao ${formatDim(dimensions.height)} mm`,
      '#6ee7b7',
      scale
    );
    spriteH.position.set(midH.x, midH.y, midH.z);
    group.add(spriteH);
  }

  // Local principal axes gizmo at OBB center
  const axisLength = maxDim * 0.18;
  const origin = new THREE.Vector3(center.x, center.y, center.z);

  const dirU = new THREE.Vector3(u.x, u.y, u.z);
  const dirV = new THREE.Vector3(v.x, v.y, v.z);
  const dirW = new THREE.Vector3(w.x, w.y, w.z);

  const arrowU = new THREE.ArrowHelper(dirU, origin, axisLength, 0xef4444, axisLength * 0.25, axisLength * 0.15); // Red (X')
  const arrowV = new THREE.ArrowHelper(dirV, origin, axisLength, 0x22c55e, axisLength * 0.25, axisLength * 0.15); // Green (Y')
  const arrowW = new THREE.ArrowHelper(dirW, origin, axisLength, 0x3b82f6, axisLength * 0.25, axisLength * 0.15); // Blue (Z')

  group.add(arrowU);
  group.add(arrowV);
  group.add(arrowW);

  return group;
}

export function formatDim(val: number): string {
  if (isNaN(val) || val === undefined) return '0.00';
  return val.toFixed(2);
}

export function formatVolume(mm3: number): string {
  if (isNaN(mm3) || mm3 === undefined) return '0.00 mm³';
  if (mm3 >= 1e6) {
    return `${(mm3 / 1e6).toFixed(2)} dm³`;
  }
  if (mm3 >= 1e3) {
    return `${(mm3 / 1e3).toFixed(2)} cm³`;
  }
  return `${mm3.toFixed(2)} mm³`;
}
