import * as xb from 'xrblocks';

const PANEL_WIDTH = 0.82;
const PANEL_HEIGHT = 0.22;
const PANEL_POS_Y = 0.5;
const PANEL_POS_Z = -1.1;
const PANEL_ROT_X = -Math.PI / 8;
/** Manages the spatial controls for weapon and animal-rain modes. */
class WeaponToolUI {
    onToggleCallback;
    onRainToggleCallback;
    weaponsEnabled = true;
    rainActive = true;
    card;
    weaponBtn;
    rainBtn;
    constructor(scene, onToggleCallback, onRainToggleCallback) {
        this.onToggleCallback = onToggleCallback;
        this.onRainToggleCallback = onRainToggleCallback;
        this.card = new xb.UICard({
            size: { width: PANEL_WIDTH, height: PANEL_HEIGHT },
        });
        this.card.name = 'Animal Attack controls';
        this.card.position.set(0, PANEL_POS_Y, PANEL_POS_Z);
        this.card.rotation.x = PANEL_ROT_X;
        this.weaponBtn = new xb.UIButton({
            label: 'Weapons: on',
            icon: 'casino',
            onClick: () => this.toggleWeapons(),
            style: { flexGrow: 1, height: '100%' },
        });
        this.rainBtn = new xb.UIButton({
            label: 'Rain: on',
            icon: 'pets',
            onClick: () => this.toggleRain(),
            style: { flexGrow: 1, height: '100%' },
        });
        const controls = new xb.UIPanel({
            style: {
                width: '100%',
                height: '100%',
                flexDirection: 'row',
                alignItems: 'stretch',
                gap: 16,
            },
        });
        controls.add(this.weaponBtn, this.rainBtn);
        this.card.add(controls);
        scene.add(this.card);
        this.onToggleCallback(this.weaponsEnabled);
        this.onRainToggleCallback(this.rainActive);
    }
    toggleRain() {
        this.rainActive = !this.rainActive;
        this.rainBtn.label = `Rain: ${this.rainActive ? 'on' : 'off'}`;
        this.onRainToggleCallback(this.rainActive);
    }
    /** Toggles weapon mode, or ensures that it starts enabled. */
    toggleWeapons(forceEnable = false) {
        this.weaponsEnabled = forceEnable || !this.weaponsEnabled;
        this.weaponBtn.label = `Weapons: ${this.weaponsEnabled ? 'on' : 'off'}`;
        this.onToggleCallback(this.weaponsEnabled);
    }
    /** Returns whether a target belongs to one of this UI's buttons. */
    isControlTarget(target) {
        let current = target;
        while (current) {
            if (current === this.weaponBtn || current === this.rainBtn)
                return true;
            current = current.parent ?? undefined;
        }
        return false;
    }
}

export { WeaponToolUI };
