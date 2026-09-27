import * as xb from "xrblocks";
import { WebRTCTransport, enableNet } from "xrblocks/addons/netblocks/src/index.js";
import { buildRoomCodeHud, getRoomCodeFromUrl } from "./roomCode.js";
//#region demos/netblocks/src/Sample.ts
/**
* Base class for netblocks samples. Wires up an xrblocks app and joins a
* room via `xb.enableNet()`. Subclasses implement `getJoinOptions()` to
* choose a default transport (typically `BroadcastChannelTransport` for
* a self-contained two-tab demo) and `onSession(session)` to attach
* app-level listeners.
*
* If the page URL has `?room=ABCD`, this base class overrides the
* default transport with `WebRTCTransport` and suffixes the room id
* with the code, so anyone arriving with the same code lands
* in the same mesh. A small DOM HUD exposes "Start new room" / "Join
* code" controls — both navigate to a new URL and reload, so we never
* have to tear a live session down in-place. The frame loop is driven
* by xrblocks itself — there's no `update()` to override.
*/
var NetSample = class extends xb.Script {
	net;
	/** Called after `joinRoom` resolves. Override to attach handlers. */
	onSession(_session) {}
	async init() {
		this.net = enableNet();
		const code = getRoomCodeFromUrl();
		let { roomId, options } = this.getJoinOptions();
		options = {
			presenceHz: 60,
			...options
		};
		if (code) {
			roomId = `${roomId}-${code}`;
			options = {
				...options,
				transport: new WebRTCTransport()
			};
		}
		buildRoomCodeHud(code);
		if (code) this._buildXrRoomCodePanel(code);
		try {
			const session = await this.net.joinRoom(roomId, options);
			this.onSession(session);
		} catch (err) {
			console.error("[netblocks/sample] failed to join room:", err);
		}
	}
	_buildXrRoomCodePanel(code) {
		const panel = new xb.UICard({
			size: {
				width: .4,
				height: .12
			},
			manipulation: {
				actions: { translate: { faceCamera: true } },
				handle: { action: "translate" }
			},
			edge: true,
			style: { backgroundColor: "#1a1a2add" }
		});
		panel.add(new xb.UIPanel({
			style: {
				width: "100%",
				height: "100%",
				justifyContent: "center",
				alignItems: "center"
			},
			children: [new xb.UIText({
				text: `Room  ${code}`,
				style: {
					color: "#7be3a4",
					fontSize: 28,
					textAlign: "center"
				}
			})]
		}));
		panel.position.set(.8, 1.9, -1.5);
		panel.rotation.y = -Math.PI / 8;
		this.add(panel);
	}
	static run(ctor) {
		document.addEventListener("DOMContentLoaded", async () => {
			const options = new xb.Options();
			options.reticles.enabled = true;
			options.controllers.visualizeRays = false;
			const app = new ctor();
			xb.add(app);
			await xb.init(options);
		});
	}
};
//#endregion
export { NetSample };
