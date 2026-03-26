import * as THREE from 'three';
import * as xb from 'xrblocks';
import {
  createSpatialPanel,
  buildSpatialActionPanel,
} from './spatial_action_panel.js';

const PANEL_WIDTH = 0.3;
const PANEL_HEIGHT = 0.3;
const PANEL_POS_X = 0;
const PANEL_POS_Y = 0.5;
const PANEL_POS_Z = -1.1;
const PANEL_ROT_X = -Math.PI / 8;

const SOURCE_MAT_COLOR = 0x444444;

const RING_RADIUS = 0.06;
const RING_TUBE = 0.008;
const RING_RADIAL_SEGMENTS = 16;
const RING_TUBULAR_SEGMENTS = 32;

const VERT_WIDTH = 0.016;
const VERT_HEIGHT = 0.16;
const VERT_DEPTH = 0.016;

const HORZ_WIDTH = 0.16;
const HORZ_HEIGHT = 0.016;
const HORZ_DEPTH = 0.016;

const ICON_Z_OFFSET = 0.01;

const WEAPON_PANEL_POS_X = -0.38;
const RAIN_PANEL_POS_X = 0.38;

const ACTIVE_COLOR = 0xff8c00;
const INACTIVE_COLOR = 0x1e1e1e;
const ACTIVE_EDGE_COLOR = 0xffffff;
const INACTIVE_EDGE_COLOR = 0x555555;
const WEAPON_ACTIVE_COLOR = 0xff0000;
const WEAPON_INACTIVE_COLOR = 0x444444;

/** Manages the spatial UI panels for weapon and rain controls. */
export class WeaponToolUI {
  public weaponsEnabled = false;
  public rainActive = false;
  public panels: xb.SpatialPanel[] = [];
  public bgMeshes: THREE.Mesh[] = [];
  public sourcePanel: xb.SpatialPanel;
  public sourceIcon: THREE.Group;
  public weaponBtn: THREE.Mesh;
  public rainBtn: THREE.Mesh;

  public constructor(
    scene: THREE.Object3D,
    private onToggleCallback: (enabled: boolean) => void,
    private onRainToggleCallback: (active: boolean) => void
  ) {
    this.sourcePanel = createSpatialPanel(
      PANEL_WIDTH,
      PANEL_HEIGHT,
      new THREE.Vector3(PANEL_POS_X, PANEL_POS_Y, PANEL_POS_Z),
      PANEL_ROT_X
    );
    scene.add(this.sourcePanel);

    this.sourceIcon = new THREE.Group();
    const sourceMat = new THREE.MeshBasicMaterial({
      color: SOURCE_MAT_COLOR,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(
        RING_RADIUS,
        RING_TUBE,
        RING_RADIAL_SEGMENTS,
        RING_TUBULAR_SEGMENTS
      ),
      sourceMat
    );
    const vert = new THREE.Mesh(
      new THREE.BoxGeometry(VERT_WIDTH, VERT_HEIGHT, VERT_DEPTH),
      sourceMat
    );
    const horz = new THREE.Mesh(
      new THREE.BoxGeometry(HORZ_WIDTH, HORZ_HEIGHT, HORZ_DEPTH),
      sourceMat
    );

    this.sourceIcon.add(ring, vert, horz);
    this.sourceIcon.position.z = ICON_Z_OFFSET;
    this.sourceIcon.userData.mat = sourceMat;
    this.sourcePanel.add(this.sourceIcon);

    const weaponUi = buildSpatialActionPanel(
      scene,
      new THREE.Vector3(WEAPON_PANEL_POS_X, PANEL_POS_Y, PANEL_POS_Z),
      'casino',
      this.bgMeshes,
      () => this.toggleWeapons()
    );
    this.panels.push(weaponUi.panel);
    this.weaponBtn = weaponUi.bgMesh;

    const rainUi = buildSpatialActionPanel(
      scene,
      new THREE.Vector3(RAIN_PANEL_POS_X, PANEL_POS_Y, PANEL_POS_Z),
      'pets',
      this.bgMeshes,
      () => {
        this.rainActive = !this.rainActive;
        this.updatePanelState(this.rainBtn, this.rainActive, ACTIVE_COLOR);
        this.onRainToggleCallback(this.rainActive);
      }
    );
    this.panels.push(rainUi.panel);
    this.rainBtn = rainUi.bgMesh;

    this.toggleWeapons(true);
    this.rainActive = true;
    this.updatePanelState(this.rainBtn, true, ACTIVE_COLOR);
    this.onRainToggleCallback(true);
  }

  /** Updates the visual state of a UI panel to reflect its active status. */
  public updatePanelState(
    bgMesh: THREE.Mesh,
    isActive: boolean,
    activeColorHex: number
  ) {
    (bgMesh.material as THREE.MeshBasicMaterial).color.setHex(
      isActive ? activeColorHex : INACTIVE_COLOR
    );
    (bgMesh.userData.edgeLine.material as THREE.LineBasicMaterial).color.setHex(
      isActive ? ACTIVE_EDGE_COLOR : INACTIVE_EDGE_COLOR
    );
  }

  /** Toggles the state of the weapons UI, optionally forcing it to be enabled. */
  public toggleWeapons(forceEnable = false) {
    if (forceEnable) {
      this.weaponsEnabled = true;
    } else {
      this.weaponsEnabled = !this.weaponsEnabled;
    }
    this.updatePanelState(this.weaponBtn, this.weaponsEnabled, ACTIVE_COLOR);
    this.sourceIcon.userData.mat.color.setHex(
      this.weaponsEnabled ? WEAPON_ACTIVE_COLOR : WEAPON_INACTIVE_COLOR
    );
    this.sourcePanel.updateLayouts();

    this.onToggleCallback(this.weaponsEnabled);
  }

  /** Retrieves the meshes acting as hitboxes for UI interaction. */
  public getHitboxes() {
    return this.bgMeshes;
  }

  /** Retrieves the array of managed spatial panels. */
  public getPanels() {
    return this.panels;
  }

  /** Retrieves the 3D group representing the source icon. */
  public getSourceIcon() {
    return this.sourceIcon;
  }
}
