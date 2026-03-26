import * as THREE from 'three';
import * as xb from 'xrblocks';

const PANEL_BG_COLOR = '#00000000';
const PANEL_SIZE = 0.65;
const PANEL_ROT_X_OFFSET = -Math.PI / 8;

const ROW_WEIGHT = 1;
const COL_WEIGHT = 1;

const ICON_FONT_SIZE = 1.0;
const ICON_FONT_COLOR = '#ffffff';
const ICON_BG_COLOR = '#00000000';

const BG_COLOR = 0x1e1e1e;
const BG_OPACITY = 0.85;
const BG_Z_OFFSET = -0.01;

const EDGE_COLOR = 0x555555;

/** Creates a basic spatial panel positioned in 3D space with a specified rotation. */
export function createSpatialPanel(
  width: number,
  height: number,
  position: THREE.Vector3,
  rotX: number
) {
  const panel = new xb.SpatialPanel({
    width,
    height,
    backgroundColor: PANEL_BG_COLOR,
    showEdge: false,
  });
  panel.draggable = false;
  panel.position.copy(position);
  panel.rotation.x = rotX;
  panel.isRoot = true;
  return panel;
}

/** Constructs an interactive spatial action panel with a given icon and trigger callback. */
export function buildSpatialActionPanel(
  scene: THREE.Object3D,
  position: THREE.Vector3,
  icon: string,
  bgMeshesArray: THREE.Mesh[],
  onTriggerCallback: () => void
) {
  // Create a transparent layout panel strictly for hosting the icon.
  const panel = createSpatialPanel(
    PANEL_SIZE,
    PANEL_SIZE,
    position,
    PANEL_ROT_X_OFFSET
  );
  scene.add(panel);
  const grid = panel.addGrid();
  const btnCell = grid
    .addRow({
      weight: ROW_WEIGHT,
      // @ts-expect-error type override
      justifyContent: 'center',
      alignItems: 'center',
    })
    .addCol({
      weight: COL_WEIGHT,
      // @ts-expect-error type override
      justifyContent: 'center',
      alignItems: 'center',
    });
  const iconBtn = btnCell.addIconButton({
    text: icon,
    fontSize: ICON_FONT_SIZE,
    fontColor: ICON_FONT_COLOR,
    backgroundColor: ICON_BG_COLOR,
  });

  // Link the button to the native XR Blocks UI event system.
  iconBtn.onTriggered = onTriggerCallback;
  panel.updateLayouts();

  // Create an explicit Three.js mesh for the background and clicking.
  const bgGeom = new THREE.PlaneGeometry(PANEL_SIZE, PANEL_SIZE);
  const bgMat = new THREE.MeshBasicMaterial({
    color: BG_COLOR,
    transparent: true,
    opacity: BG_OPACITY,
    depthWrite: false,
  });
  const bgMesh = new THREE.Mesh(bgGeom, bgMat);
  bgMesh.position.z = BG_Z_OFFSET; // Push slightly behind the text.

  // Explicit Three.js line for the border.
  const edgeGeom = new THREE.EdgesGeometry(bgGeom);
  const edgeMat = new THREE.LineBasicMaterial({color: EDGE_COLOR});
  const edgeLine = new THREE.LineSegments(edgeGeom, edgeMat);
  edgeLine.raycast = () => {}; // Disable raycasting on the line too.
  bgMesh.add(edgeLine);

  // Bind data for styling.
  bgMesh.userData = {
    ...bgMesh.userData,
    onTrigger: onTriggerCallback,
    edgeLine,
  };
  panel.add(bgMesh);
  bgMeshesArray.push(bgMesh);

  return {panel, bgMesh};
}
