import * as THREE from 'three';

/**
 * Singleton Palette class for generating random colors and
 * selecting from a predefined color palette.
 */
class XRPalette {
    /**
     * Creates a singleton instance of the Palette class.
     */
    constructor() {
        this.fullGColors_ = [
            0x174ea6, 0xa50e0e, 0xe37400, 0x0d652d, 0x4285f4, 0xea4335, 0xfbbc04,
            0x34a853, 0xd2e3fc, 0xfad2cf, 0xfeefc3, 0xceead6, 0xf1f3f4, 0x9aa0a6,
            0x202124,
        ];
        this.liteGColors_ = [0xea4335, 0x4285f4, 0x34ab53, 0xfbbc04];
        this.lastRandomColor_ = null;
        if (XRPalette.instance) {
            return XRPalette.instance;
        }
        XRPalette.instance = this;
    }
    /**
     * Returns a completely random color.
     * @returns A random color.
     */
    getRandom() {
        return new THREE.Color(Math.random() * 0xffffff);
    }
    getRandomColorFromPalette(palette) {
        let newColor;
        do {
            const baseColorIndex = Math.floor(Math.random() * palette.length);
            const baseColor = palette[baseColorIndex];
            newColor = new THREE.Color(baseColor);
        } while (this.lastRandomColor_ && newColor.equals(this.lastRandomColor_));
        this.lastRandomColor_ = newColor;
        return newColor;
    }
    /**
     * Returns a random color from the predefined Google color palette.
     * @returns A random base color.
     */
    getRandomLiteGColor() {
        return this.getRandomColorFromPalette(this.liteGColors_);
    }
    /**
     * Returns a random color from the predefined Google color palette.
     * @returns A random base color.
     */
    getRandomFullGColor() {
        return this.getRandomColorFromPalette(this.fullGColors_);
    }
}
// Exporting a singleton instance of the Palette class.
const palette = new XRPalette();

export { palette };
