import * as THREE from 'three';
import * as xb from 'xrblocks';

const PANEL_WIDTH = 1.2;
const PANEL_HEIGHT = 0.6;
const PANEL_POS_X = 0;
const PANEL_POS_Y = 2.2;
const PANEL_POS_Z = -1;
const PANEL_ROT_X = Math.PI / 8;
const IMAGE_SIZE = 280;
const MESH_WIDTH = 0.28;
const MESH_HEIGHT = 0.28;
const Z_OFFSET = 0.01;
/** UI component that presents a slider interface for selecting animal models. */
class AnimalSlider {
    models;
    currentIndex = 0;
    paletteItems = [];
    panel;
    prevBtn;
    nextBtn;
    animalImage;
    animalName;
    sliderMesh;
    constructor(scene, models) {
        this.models = models;
        this.panel = AnimalSlider.createPanel();
        this.prevBtn = this.createSlideButton('arrow_back', 'Previous animal', -1);
        this.nextBtn = this.createSlideButton('arrow_forward', 'Next animal', 1);
        this.animalImage = new xb.UIImage({
            src: models[0].img,
            ariaLabel: models[0].name,
            style: {
                width: IMAGE_SIZE,
                height: IMAGE_SIZE,
                objectFit: 'contain',
            },
        });
        this.animalName = new xb.UIText({
            text: models[0].name,
            style: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
        });
        const controls = new xb.UIPanel({
            style: {
                width: '100%',
                flexGrow: 1,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
            },
        });
        controls.add(this.prevBtn, this.animalImage, this.nextBtn);
        this.panel.add(this.animalName, controls);
        this.sliderMesh = this.createPaletteHitbox();
        scene.add(this.panel, this.sliderMesh);
    }
    /** Creates the base spatial panel for the slider. */
    static createPanel() {
        const panel = new xb.UICard({
            size: { width: PANEL_WIDTH, height: PANEL_HEIGHT },
        });
        panel.name = 'Animal picker';
        panel.position.set(PANEL_POS_X, PANEL_POS_Y, PANEL_POS_Z);
        panel.rotation.x = PANEL_ROT_X;
        return panel;
    }
    createSlideButton(icon, ariaLabel, direction) {
        return new xb.UIButton({
            icon,
            ariaLabel,
            onClick: () => this.slide(direction),
            style: { width: 120, height: 100 },
        });
    }
    /** Creates an invisible surface for dragging the selected animal. */
    createPaletteHitbox() {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(MESH_WIDTH, MESH_HEIGHT), new THREE.MeshBasicMaterial({
            colorWrite: false,
            depthWrite: false,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
        }));
        mesh.name = 'Animal palette drag surface';
        mesh.position.copy(this.panel.position);
        mesh.quaternion.copy(this.panel.quaternion);
        mesh.translateZ(Z_OFFSET);
        mesh.userData = {
            isPaletteItem: true,
            animalIndex: this.currentIndex,
        };
        this.paletteItems.push(mesh);
        return mesh;
    }
    /** Returns whether a target is one of the slider buttons. */
    isControlTarget(target) {
        let current = target;
        while (current) {
            if (current === this.prevBtn || current === this.nextBtn)
                return true;
            current = current.parent ?? undefined;
        }
        return false;
    }
    /** Shifts the slider selection by the given direction offset. */
    slide(direction) {
        this.currentIndex = AnimalSlider.getWrappedIndex(this.currentIndex, direction, this.models.length);
        const model = this.models[this.currentIndex];
        this.animalImage.src = model.img;
        this.animalName.text = model.name;
        this.sliderMesh.userData.animalIndex = this.currentIndex;
    }
    /** Calculates a safely wrapped array index to handle circular scrolling. */
    static getWrappedIndex(currentIndex, direction, totalLength) {
        return THREE.MathUtils.euclideanModulo(currentIndex + direction, totalLength);
    }
    /** Retrieves the draggable/spawning elements from the slider. */
    getPaletteItems() {
        return this.paletteItems;
    }
}

export { AnimalSlider };
