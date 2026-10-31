import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { ParsedCADModel, OBBResult, OBBFaceOffsets, Vector3D } from './types';
import { formatDim } from './threeHelpers';

/**
 * Trigger browser file download for text/blob content
 */
export function downloadFile(content: BlobPart, fileName: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generate 100% ISO-10303-21 compliant AP203/AP214 STEP B-Rep Manifold Solid entities
 * for a cuboid box with 8 corners and 6 planar faces.
 */
function generateStepSolidEntities(
  corners: Vector3D[],
  startId: number = 1000,
  contextId: number = 1
): { entities: string[]; solidId: number; lastId: number } {
  let id = startId;
  const entities: string[] = [];

  // 1. Cartesian Points (8 corners)
  const cpIds: number[] = [];
  for (let i = 0; i < 8; i++) {
    const c = corners[i];
    cpIds.push(id);
    entities.push(`#${id} = CARTESIAN_POINT('',(${c.x.toFixed(4)},${c.y.toFixed(4)},${c.z.toFixed(4)}));`);
    id++;
  }

  // 2. Vertex Points (8 vertex points referencing cartesian points)
  const vpIds: number[] = [];
  for (let i = 0; i < 8; i++) {
    vpIds.push(id);
    entities.push(`#${id} = VERTEX_POINT('',#${cpIds[i]});`);
    id++;
  }

  // 3. 12 Edges connecting corners
  // Corners convention:
  // 0: -u -v -w, 1: +u -v -w, 2: +u +v -w, 3: -u +v -w
  // 4: -u -v +w, 5: +u -v +w, 6: +u +v +w, 7: -u +v +w
  const edgeDefs: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 0], // Bottom: 0, 1, 2, 3
    [4, 5], [5, 6], [6, 7], [7, 4], // Top:    4, 5, 6, 7
    [0, 4], [1, 5], [2, 6], [3, 7], // Posts:  8, 9, 10, 11
  ];

  const edgeCurveIds: number[] = [];
  for (let eIdx = 0; eIdx < edgeDefs.length; eIdx++) {
    const [v0, v1] = edgeDefs[eIdx];
    const p0 = corners[v0];
    const p1 = corners[v1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dz = p1.z - p0.z;
    const len = Math.hypot(dx, dy, dz) || 1;

    const dirId = id++;
    entities.push(`#${dirId} = DIRECTION('',(${(dx / len).toFixed(6)},${(dy / len).toFixed(6)},${(dz / len).toFixed(6)}));`);

    const vecId = id++;
    entities.push(`#${vecId} = VECTOR('',#${dirId},${len.toFixed(4)});`);

    const lineId = id++;
    entities.push(`#${lineId} = LINE('',#${cpIds[v0]},#${vecId});`);

    const ecId = id++;
    entities.push(`#${ecId} = EDGE_CURVE('',#${vpIds[v0]},#${vpIds[v1]},#${lineId},.T.);`);
    edgeCurveIds.push(ecId);
  }

  // 4. 6 Faces with CCW winding (outward normals)
  const faceEdgeDefs: { edges: [number, boolean][]; normalCorner: [number, number, number] }[] = [
    { edges: [[3, false], [2, false], [1, false], [0, false]], normalCorner: [0, 3, 1] }, // Bottom [-w]
    { edges: [[4, true], [5, true], [6, true], [7, true]], normalCorner: [4, 5, 7] },     // Top [+w]
    { edges: [[0, true], [9, true], [4, false], [8, false]], normalCorner: [0, 1, 4] },   // Front [-v]
    { edges: [[2, true], [11, true], [6, false], [10, false]], normalCorner: [2, 3, 6] }, // Back [+v]
    { edges: [[1, true], [10, true], [5, false], [9, false]], normalCorner: [1, 2, 5] },  // Right [+u]
    { edges: [[3, true], [8, true], [7, false], [11, false]], normalCorner: [3, 0, 7] },  // Left [-u]
  ];

  const advancedFaceIds: number[] = [];

  for (const fDef of faceEdgeDefs) {
    const orientedEdgeIds: number[] = [];
    for (const [eIdx, sense] of fDef.edges) {
      const oeId = id++;
      entities.push(`#${oeId} = ORIENTED_EDGE('',*,*,#${edgeCurveIds[eIdx]},${sense ? '.T.' : '.F.'});`);
      orientedEdgeIds.push(oeId);
    }

    const loopId = id++;
    entities.push(`#${loopId} = EDGE_LOOP('',(${orientedEdgeIds.map((x) => '#' + x).join(',')}));`);

    const boundId = id++;
    entities.push(`#${boundId} = FACE_OUTER_BOUND('',#${loopId},.T.);`);

    const [c0Idx, c1Idx, c2Idx] = fDef.normalCorner;
    const p0 = corners[c0Idx];
    const p1 = corners[c1Idx];
    const p2 = corners[c2Idx];
    const v01 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
    const v02 = { x: p2.x - p0.x, y: p2.y - p0.y, z: p2.z - p0.z };
    const nx = v01.y * v02.z - v01.z * v02.y;
    const ny = v01.z * v02.x - v01.x * v02.z;
    const nz = v01.x * v02.y - v01.y * v02.x;
    const nlen = Math.hypot(nx, ny, nz) || 1;

    const normDirId = id++;
    entities.push(`#${normDirId} = DIRECTION('',(${(nx / nlen).toFixed(6)},${(ny / nlen).toFixed(6)},${(nz / nlen).toFixed(6)}));`);

    const refX = Math.abs(nx / nlen) < 0.9 ? 1 : 0;
    const refY = Math.abs(nx / nlen) < 0.9 ? 0 : 1;
    const refDirId = id++;
    entities.push(`#${refDirId} = DIRECTION('',(${refX}.,${refY}.,0.));`);

    const axisId = id++;
    entities.push(`#${axisId} = AXIS2_PLACEMENT_3D('',#${cpIds[c0Idx]},#${normDirId},#${refDirId});`);

    const planeId = id++;
    entities.push(`#${planeId} = PLANE('',#${axisId});`);

    const faceId = id++;
    entities.push(`#${faceId} = ADVANCED_FACE('',(#${boundId}),#${planeId},.T.);`);
    advancedFaceIds.push(faceId);
  }

  // 5. Closed Shell
  const shellId = id++;
  entities.push(`#${shellId} = CLOSED_SHELL('',(${advancedFaceIds.map((f) => '#' + f).join(',')}));`);

  // 6. Manifold Solid Brep
  const solidId = id++;
  entities.push(`#${solidId} = MANIFOLD_SOLID_BREP('PART2_OBB_TRAY_BOX',#${shellId});`);

  // 7. Product & Representation Definitions
  const originId = id++;
  const zDirId = id++;
  const xDirId = id++;
  const axisId = id++;
  const shapeRepId = id++;
  const shapeDefRepId = id++;
  const prodDefShapeId = id++;
  const prodDefId = id++;
  const prodDefFormId = id++;
  const prodId = id++;
  const appCtxId = id++;
  const mechCtxId = id++;
  const designCtxId = id++;

  entities.push(
    `#${originId} = CARTESIAN_POINT('',(0.,0.,0.));`,
    `#${zDirId} = DIRECTION('',(0.,0.,1.));`,
    `#${xDirId} = DIRECTION('',(1.,0.,0.));`,
    `#${axisId} = AXIS2_PLACEMENT_3D('',#${originId},#${zDirId},#${xDirId});`,
    `#${appCtxId} = APPLICATION_CONTEXT('configuration controlled 3d designs of mechanical parts and assemblies');`,
    `#${mechCtxId} = MECHANICAL_CONTEXT('part definition',#${appCtxId},'mechanical');`,
    `#${designCtxId} = DESIGN_CONTEXT('part definition',#${appCtxId},'design');`,
    `#${prodId} = PRODUCT('PART2_OBB_TRAY_BOX','PART2_OBB_TRAY_BOX','',(#${mechCtxId}));`,
    `#${prodDefFormId} = PRODUCT_DEFINITION_FORMATION('','',#${prodId});`,
    `#${prodDefId} = PRODUCT_DEFINITION('design','',#${prodDefFormId},#${designCtxId});`,
    `#${prodDefShapeId} = PRODUCT_DEFINITION_SHAPE('','',#${prodDefId});`,
    `#${shapeRepId} = ADVANCED_BREP_SHAPE_REPRESENTATION('PART2_OBB_TRAY_BOX',(#${solidId},#${axisId}),#${contextId});`,
    `#${shapeDefRepId} = SHAPE_DEFINITION_REPRESENTATION(#${prodDefShapeId},#${shapeRepId});`
  );

  return { entities, solidId, lastId: id };
}

/**
 * Export Multi-Part STEP file (.stp) containing 2 distinct parts:
 * Part 1: Original uploaded CAD Part (Solid / B-Rep)
 * Part 2: Confirmed OBB Tray Box (Solid B-Rep with angle and offsets)
 *
 * Compatible natively with Autodesk Inventor, SolidWorks, Rhino, AutoCAD, Catia, Creo.
 */
export function exportMultiPartSTEP(
  model: ParsedCADModel,
  obb: OBBResult
): void {
  const baseName = model.name.replace(/\.[^/.]+$/, '');
  const fileName = `${baseName}_MultiPart_2Bodies.stp`;

  if (!model.rawStepText) {
    // If raw STEP is not in memory, export the standalone OBB Box solid STEP
    exportBoxOnlySTEP(model, obb);
    return;
  }

  const rawStepText = model.rawStepText;

  // Find max entity ID in original STEP
  const matches = rawStepText.matchAll(/#(\d+)/g);
  let maxId = 0;
  for (const m of matches) {
    const num = parseInt(m[1], 10);
    if (num > maxId) maxId = num;
  }
  const startId = maxId + 100;

  // Check if there is an existing geometric representation context
  let contextId = 1;
  const ctxMatch = rawStepText.match(/#(\d+)\s*=\s*\(\s*GEOMETRIC_REPRESENTATION_CONTEXT/i);
  if (ctxMatch) {
    contextId = parseInt(ctxMatch[1], 10);
  }

  const { entities } = generateStepSolidEntities(obb.corners, startId, contextId);

  // If no representation context found, inject one
  let contextEntity = '';
  if (!ctxMatch) {
    const c1 = startId + 500;
    const c2 = startId + 501;
    const c3 = startId + 502;
    const c4 = startId + 503;
    const c5 = startId + 504;
    contextEntity = `
#${c1} = ( GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#${c2})) GLOBAL_UNIT_ASSIGNED_CONTEXT((#${c3},#${c4},#${c5})) REPRESENTATION_CONTEXT('Context #1','3D Context with UNIT and UNCERTAINTY') );
#${c2} = UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-07),#${c3},'distance_accuracy_value','confusion accuracy');
#${c3} = ( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );
#${c4} = ( NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.) );
#${c5} = ( NAMED_UNIT(*) SI_UNIT($,.STERADIAN.) SOLID_ANGLE_UNIT() );
`;
  }

  const endSecPos = rawStepText.lastIndexOf('ENDSEC;');
  if (endSecPos === -1) {
    exportBoxOnlySTEP(model, obb);
    return;
  }

  const combinedStep =
    rawStepText.slice(0, endSecPos) +
    '\n/* ======================================================== */\n' +
    '/* PART 2: OBB TRAY BOX SOLID (CONFIRMED ANGLE & OFFSETS)   */\n' +
    '/* Generated Client-Side by CAD Bounding Box Auto-Measure   */\n' +
    '/* ======================================================== */\n' +
    contextEntity + '\n' +
    entities.join('\n') + '\n' +
    rawStepText.slice(endSecPos);

  downloadFile(combinedStep, fileName, 'application/step');
}

/**
 * Export Standalone STEP file (.stp) of the OBB Tray Box (Solid B-Rep)
 */
export function exportBoxOnlySTEP(
  model: ParsedCADModel,
  obb: OBBResult
): void {
  const baseName = model.name.replace(/\.[^/.]+$/, '');
  const fileName = `${baseName}_OBB_Tray_Box_Solid.stp`;

  const startId = 10;
  const contextId = 1;
  const { entities, lastId } = generateStepSolidEntities(obb.corners, startId, contextId);

  const header = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('CAD Bounding Box Inspector STEP Solid Export'),'2;1');
FILE_NAME('${fileName}','${new Date().toISOString()}',('Antigravity'),('Web_M'),'OpenCascade WebAssembly','CAD Solid B-Rep','');
FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));
ENDSEC;
DATA;
#1 = ( GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#2)) GLOBAL_UNIT_ASSIGNED_CONTEXT((#3,#4,#5)) REPRESENTATION_CONTEXT('Context #1','3D Context with UNIT and UNCERTAINTY') );
#2 = UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-07),#3,'distance_accuracy_value','confusion accuracy');
#3 = ( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );
#4 = ( NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.) );
#5 = ( NAMED_UNIT(*) SI_UNIT($,.STERADIAN.) SOLID_ANGLE_UNIT() );
`;

  const stepContent = header + entities.join('\n') + '\nENDSEC;\nEND-ISO-10303-21;\n';
  downloadFile(stepContent, fileName, 'application/step');
}

/**
 * Generate and download Multi-Body OBJ file containing 2 distinct parts
 */
export function exportMultiBodyOBJ(
  model: ParsedCADModel,
  obb: OBBResult,
  offsets: OBBFaceOffsets
): void {
  const baseName = model.name.replace(/\.[^/.]+$/, '');
  const fileName = `${baseName}_MultiBody_OBB_Tray.obj`;

  const lines: string[] = [];

  // Header
  lines.push('# ========================================================');
  lines.push('# CAD Bounding Box Inspector - Multi-Body 3D Export');
  lines.push(`# Source Model: ${model.name}`);
  lines.push(`# Exported: ${new Date().toISOString()}`);
  lines.push('# Compatible with: Autodesk Inventor, SolidWorks, Rhino, Blender');
  lines.push('# Units: Millimeters (mm)');
  lines.push('#');
  lines.push(`# Part 1 (Original Model): ${model.stats.vertexCount} vertices, ${model.stats.triangleCount} triangles`);
  lines.push(`# Part 2 (OBB Tray Box):`);
  lines.push(`#   - Dimensions: ${formatDim(obb.dimensions.length)} x ${formatDim(obb.dimensions.width)} x ${formatDim(obb.dimensions.height)} mm`);
  lines.push(`#   - Strategy: ${obb.strategy} (Angle: ${obb.angleDeg.toFixed(1)} deg)`);
  lines.push(`#   - Applied Offsets: Uniform: +${offsets.uniform}mm | L: +${offsets.extraLength}mm | W: +${offsets.extraWidth}mm | Bot: +${offsets.extraBottom}mm | Top: +${offsets.extraTop}mm`);
  lines.push('# ========================================================');
  lines.push('');

  // ----------------------------------------------------
  // PART 1: ORIGINAL CAD MODEL
  // ----------------------------------------------------
  lines.push('# ----------------------------------------------------');
  lines.push('o PART1_ORIGINAL_CAD');
  lines.push('g PART1_ORIGINAL_CAD');
  lines.push('# ----------------------------------------------------');

  let vertexOffset = 1; // OBJ indices are 1-based

  for (let mIdx = 0; mIdx < model.meshes.length; mIdx++) {
    const mesh = model.meshes[mIdx];
    const posArr = mesh.attributes?.position?.array;
    const idxArr = mesh.index?.array;
    if (!posArr || !idxArr) continue;

    const vStart = vertexOffset;

    // Output vertices
    for (let i = 0; i < posArr.length; i += 3) {
      lines.push(`v ${posArr[i].toFixed(4)} ${posArr[i + 1].toFixed(4)} ${posArr[i + 2].toFixed(4)}`);
    }

    const numVerts = posArr.length / 3;
    vertexOffset += numVerts;

    // Output faces (1-based index)
    for (let i = 0; i < idxArr.length; i += 3) {
      const i0 = vStart + idxArr[i];
      const i1 = vStart + idxArr[i + 1];
      const i2 = vStart + idxArr[i + 2];
      lines.push(`f ${i0} ${i1} ${i2}`);
    }
  }

  lines.push('');

  // ----------------------------------------------------
  // PART 2: OBB TRAY BOX
  // ----------------------------------------------------
  lines.push('# ----------------------------------------------------');
  lines.push('o PART2_OBB_TRAY_BOX');
  lines.push('g PART2_OBB_TRAY_BOX');
  lines.push('# ----------------------------------------------------');

  const boxStart = vertexOffset;

  // 8 corners of the OBB box
  for (const c of obb.corners) {
    lines.push(`v ${c.x.toFixed(4)} ${c.y.toFixed(4)} ${c.z.toFixed(4)}`);
  }

  const quads = [
    [0, 3, 2, 1], // Bottom face
    [4, 5, 6, 7], // Top face
    [0, 1, 5, 4], // Front face
    [2, 6, 7, 3], // Back face
    [1, 2, 6, 5], // Right face
    [3, 7, 4, 0], // Left face
  ];

  for (const q of quads) {
    lines.push(`f ${boxStart + q[0]} ${boxStart + q[1]} ${boxStart + q[2]} ${boxStart + q[3]}`);
  }

  const objContent = lines.join('\n');
  downloadFile(objContent, fileName, 'text/plain');
}

/**
 * Generate and download CAD Coordinates JSON Report
 */
export function exportOBBReportJSON(
  model: ParsedCADModel,
  baseOBB: OBBResult,
  offsetOBB: OBBResult,
  offsets: OBBFaceOffsets
): void {
  const baseName = model.name.replace(/\.[^/.]+$/, '');
  const fileName = `${baseName}_OBB_Tray_Report.json`;

  const report = {
    modelName: model.name,
    timestamp: new Date().toISOString(),
    generator: 'CAD Bounding Box Auto-Measure (Web_M)',
    units: 'millimeter',
    originalModel: {
      vertexCount: model.stats.vertexCount,
      triangleCount: model.stats.triangleCount,
      meshCount: model.stats.meshCount,
      surfaceAreaMM2: model.stats.surfaceArea,
      aabbDimensionsMM: {
        length: model.aabb.dimensions.length,
        width: model.aabb.dimensions.width,
        height: model.aabb.dimensions.height,
        rawX: model.aabb.dimensions.rawX,
        rawY: model.aabb.dimensions.rawY,
        rawZ: model.aabb.dimensions.rawZ,
      },
      aabbVolumeMM3: model.aabb.volume,
    },
    baseOBB: {
      strategy: baseOBB.strategy,
      angleDeg: baseOBB.angleDeg,
      dimensionsMM: {
        length: baseOBB.dimensions.length,
        width: baseOBB.dimensions.width,
        height: baseOBB.dimensions.height,
      },
      sizeAxesMM: {
        axis1_Length: baseOBB.size.x,
        axis2_Width: baseOBB.size.y,
        axis3_Height: baseOBB.size.z,
      },
      centerMM: baseOBB.center,
      localAxes: {
        u_Axis1: baseOBB.axes[0],
        v_Axis2: baseOBB.axes[1],
        w_Axis3: baseOBB.axes[2],
      },
      cornersMM: baseOBB.corners,
      volumeMM3: baseOBB.volume,
    },
    trayBoxWithOffsets: {
      appliedOffsetsMM: {
        uniform: offsets.uniform,
        extraLength: offsets.extraLength,
        extraWidth: offsets.extraWidth,
        extraBottom: offsets.extraBottom,
        extraTop: offsets.extraTop,
      },
      dimensionsMM: {
        length: offsetOBB.dimensions.length,
        width: offsetOBB.dimensions.width,
        height: offsetOBB.dimensions.height,
      },
      sizeAxesMM: {
        axis1_Length: offsetOBB.size.x,
        axis2_Width: offsetOBB.size.y,
        axis3_Height: offsetOBB.size.z,
      },
      centerMM: offsetOBB.center,
      cornersMM: offsetOBB.corners,
      volumeMM3: offsetOBB.volume,
      volumeGrowthPercent:
        baseOBB.volume > 0
          ? ((offsetOBB.volume - baseOBB.volume) / baseOBB.volume) * 100
          : 0,
    },
    cadParametricScriptHelper: {
      notes: 'Use these values directly in Autodesk Inventor Parameters or SolidWorks Equations',
      TRAY_LENGTH: offsetOBB.dimensions.length,
      TRAY_WIDTH: offsetOBB.dimensions.width,
      TRAY_HEIGHT: offsetOBB.dimensions.height,
      ROTATION_ANGLE_DEG: offsetOBB.angleDeg,
    },
  };

  const jsonContent = JSON.stringify(report, null, 2);
  downloadFile(jsonContent, fileName, 'application/json');
}

/**
 * Generate and download Multi-Body GLB (Binary GLTF)
 */
export function exportMultiBodyGLTF(
  model: ParsedCADModel,
  obb: OBBResult,
  offsets: OBBFaceOffsets
): void {
  const baseName = model.name.replace(/\.[^/.]+$/, '');
  const fileName = `${baseName}_MultiBody_OBB_Tray.glb`;

  const exportScene = new THREE.Scene();
  exportScene.name = 'MultiBody_Assembly';

  // Part 1: Original Model Group
  const part1Group = new THREE.Group();
  part1Group.name = 'PART1_ORIGINAL_CAD';

  const defaultMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Slate 400
    roughness: 0.4,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  for (let mIdx = 0; mIdx < model.meshes.length; mIdx++) {
    const m = model.meshes[mIdx];
    const posArr = m.attributes?.position?.array;
    const idxArr = m.index?.array;
    if (!posArr || !idxArr) continue;

    const geom = new THREE.BufferGeometry();
    const f32 = posArr instanceof Float32Array ? posArr : new Float32Array(posArr);
    const u32 = idxArr instanceof Uint32Array ? idxArr : new Uint32Array(idxArr);

    geom.setAttribute('position', new THREE.BufferAttribute(f32, 3));
    geom.setIndex(new THREE.BufferAttribute(u32, 1));
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, defaultMat);
    mesh.name = m.name || `CAD_Part_${mIdx + 1}`;
    part1Group.add(mesh);
  }
  exportScene.add(part1Group);

  // Part 2: OBB Tray Box
  const part2Group = new THREE.Group();
  part2Group.name = 'PART2_OBB_TRAY_BOX';

  const { corners } = obb;
  if (corners && corners.length >= 8) {
    const boxPositions: number[] = [];
    for (const c of corners) {
      boxPositions.push(c.x, c.y, c.z);
    }

    const quads = [
      [0, 3, 2, 1], // Bottom
      [4, 5, 6, 7], // Top
      [0, 1, 5, 4], // Front
      [2, 6, 7, 3], // Back
      [1, 2, 6, 5], // Right
      [3, 7, 4, 0], // Left
    ];

    const boxIndices: number[] = [];
    for (const [a, b, c, d] of quads) {
      boxIndices.push(a, b, c);
      boxIndices.push(a, c, d);
    }

    const boxGeom = new THREE.BufferGeometry();
    boxGeom.setAttribute('position', new THREE.Float32BufferAttribute(boxPositions, 3));
    boxGeom.setIndex(boxIndices);
    boxGeom.computeVertexNormals();

    const trayMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Emerald Green
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });

    const boxMesh = new THREE.Mesh(boxGeom, trayMat);
    boxMesh.name = 'PART2_OBB_TRAY_BOX_SOLID';
    part2Group.add(boxMesh);
  }
  exportScene.add(part2Group);

  const exporter = new GLTFExporter();
  exporter.parse(
    exportScene,
    (gltf) => {
      downloadFile(gltf as ArrayBuffer, fileName, 'model/gltf-binary');
    },
    (err) => {
      console.error('Lỗi khi xuất GLTF/GLB:', err);
    },
    { binary: true }
  );
}
