import * as THREE from 'three';
import { createSpatialPanel } from './spatial_action_panel.js';

const PANEL_WIDTH = 1.2;
const PANEL_HEIGHT = 0.6;
const PANEL_POS_X = 0;
const PANEL_POS_Y = 2.2;
const PANEL_POS_Z = -1;
const PANEL_ROT_X = Math.PI / 8;
const ROW_WEIGHT = 1.0;
const BTN_COL_WEIGHT = 0.25;
const SPACE_COL_WEIGHT = 0.5;
const ICON_FONT_SIZE = 0.6;
const ICON_FONT_COLOR = '#ffffff';
const MESH_WIDTH = 0.4;
const MESH_HEIGHT = 0.4;
const ALPHA_TEST = 0.1;
const Z_OFFSET = 0.01;
/** UI component that presents a slider interface for selecting animal models. */
class AnimalSlider {
    models;
    currentIndex = 0;
    paletteItems = [];
    textures;
    panel;
    prevBtn;
    nextBtn;
    sliderMaterial;
    sliderMesh;
    constructor(scene, models) {
        this.models = models;
        this.textures = models.map(({ img }) => new THREE.TextureLoader().load(img));
        this.panel = AnimalSlider.createPanel();
        scene.add(this.panel);
        this.setupGrid();
        this.setupMesh();
    }
    /** Creates the base spatial panel for the slider. */
    static createPanel() {
        return createSpatialPanel(PANEL_WIDTH, PANEL_HEIGHT, new THREE.Vector3(PANEL_POS_X, PANEL_POS_Y, PANEL_POS_Z), PANEL_ROT_X);
    }
    /** Initializes the UI grid and buttons for the slider. */
    setupGrid() {
        const grid = this.panel.addGrid();
        const sliderRow = grid.addRow({ weight: ROW_WEIGHT });
        this.prevBtn = sliderRow.addCol({ weight: BTN_COL_WEIGHT }).addIconButton({
            text: 'arrow_back',
            fontSize: ICON_FONT_SIZE,
            fontColor: ICON_FONT_COLOR,
        });
        sliderRow.addCol({ weight: SPACE_COL_WEIGHT }); // Restored exactly to 0.5 to fix the gap.
        this.nextBtn = sliderRow.addCol({ weight: BTN_COL_WEIGHT }).addIconButton({
            text: 'arrow_forward',
            fontSize: ICON_FONT_SIZE,
            fontColor: ICON_FONT_COLOR,
        });
        this.prevBtn.onTriggered = () => this.slide(-1);
        this.nextBtn.onTriggered = () => this.slide(1);
        this.panel.updateLayouts();
    }
    /** Initializes the 3D mesh used to display the current animal texture. */
    setupMesh() {
        const geometry = new THREE.PlaneGeometry(MESH_WIDTH, MESH_HEIGHT);
        this.sliderMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            alphaTest: ALPHA_TEST,
            side: THREE.DoubleSide,
        });
        this.sliderMesh = new THREE.Mesh(geometry, this.sliderMaterial);
        this.sliderMesh.position.set(0, 0, Z_OFFSET);
        this.sliderMesh.userData = {
            isPaletteItem: true,
            animalIndex: this.currentIndex,
        };
        this.panel.add(this.sliderMesh);
        this.paletteItems.push(this.sliderMesh);
        this.sliderMaterial.map = this.textures[this.currentIndex];
    }
    /** Shifts the slider selection by the given direction offset. */
    slide(direction) {
        this.currentIndex = AnimalSlider.getWrappedIndex(this.currentIndex, direction, this.models.length);
        this.sliderMaterial.map = this.textures[this.currentIndex];
        this.sliderMesh.userData.animalIndex = this.currentIndex;
    }
    /** Calculates a safely wrapped array index to handle circular scrolling. */
    static getWrappedIndex(currentIndex, direction, totalLength) {
        return THREE.MathUtils.euclideanModulo(currentIndex + direction, totalLength);
    }
    /** Retrieves the meshes that should be interactable within this UI. */
    getHitboxes() {
        return [this.prevBtn, this.nextBtn, this.sliderMesh];
    }
    /** Retrieves the draggable/spawning elements from the slider. */
    getPaletteItems() {
        return this.paletteItems;
    }
}

export { AnimalSlider };
