import RAPIER from "@dimforge/rapier3d-simd-compat";
import * as xb from "xrblocks";
import { Drone } from "./Drone.js";
//#region samples/advanced/drone/src/main.ts
const options = new xb.Options();
options.depth = new xb.DepthOptions(xb.xrDepthMeshPhysicsOptions);
options.depth.depthMesh.updateFullResolutionGeometry = true;
options.xrButton = {
	...options.xrButton,
	startText: "<i id=\"xrlogo\"></i> LET THE FUN BEGIN",
	endText: "<i id=\"xrlogo\"></i> MISSION COMPLETE"
};
options.physics.RAPIER = RAPIER;
document.addEventListener("DOMContentLoaded", async () => {
	xb.add(new Drone());
	await xb.init(options);
});
//#endregion
