import * as xb from 'xrblocks';
export class DroneKeyboardControls extends xb.Script {
    _onKeyDown = this.onKeyDown.bind(this);
    _onKeyUp = this.onKeyUp.bind(this);
    downKeys = new Set();
    init() {
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
    }
    onKeyDown(event) {
        this.downKeys.add(event.code);
    }
    onKeyUp(event) {
        this.downKeys.delete(event.code);
    }
    getDroneForwardForce() {
        return Number(this.downKeys.has(xb.Keycodes.DOWN)) -
            Number(this.downKeys.has(xb.Keycodes.UP));
    }
    getDroneRightForce() {
        return Number(this.downKeys.has(xb.Keycodes.RIGHT)) -
            Number(this.downKeys.has(xb.Keycodes.LEFT));
    }
    getDroneUpForce() {
        return Number(this.downKeys.has(xb.Keycodes.PAGE_UP)) -
            Number(this.downKeys.has(xb.Keycodes.PAGE_DOWN));
    }
}
//# sourceMappingURL=DroneKeyboardControls.js.map