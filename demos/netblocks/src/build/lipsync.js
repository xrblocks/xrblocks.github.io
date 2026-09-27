import * as THREE from "three";
import * as xb from "xrblocks";
import { BroadcastChannelTransport } from "xrblocks/addons/netblocks/src/index.js";
import { LipsyncMouth } from "xrblocks/addons/lipsync/index.js";
import { NetSample } from "./Sample.js";
//#region demos/netblocks/src/lipsync.ts
/**
* NetblocksLipsyncSample.
*
* Multiplayer demo: every remote peer's voice stream drives the face
* that netblocks already attaches to their avatar. Opens this page in
* two browser tabs and the avatars visibly speak with each other's
* voices.
*
* The static face (eyes + closed mouth) is part of netblocks's default
* avatar — it appears the moment a peer joins, regardless of whether
* they ever enable voice. This sample only adds the audio→viseme
* driver: a per-peer `LipsyncMouth` whose `target` is that face.
*
* Uses `BroadcastChannelTransport` for zero-broker two-tab demos. Click
* the room-code "Start new room" button in the top-left to switch to
* the WebRTC transport for cross-machine multiplayer.
*
* One shared `AudioContext` is reused across all peer drivers so the
* browser doesn't run out of context slots when more than a handful of
* peers join.
*/
var NetblocksLipsyncSample = class extends NetSample {
	sharedCtx = THREE.AudioContext.getContext();
	drivers = /* @__PURE__ */ new Map();
	domBtn;
	spatialBtn;
	spatialStatus;
	getJoinOptions() {
		return {
			roomId: "lipsync-netblocks",
			options: {
				transport: new BroadcastChannelTransport(),
				displayName: `User-${Math.floor(Math.random() * 1e3)}`
			}
		};
	}
	onSession(session) {
		session.voice.onTrack((peerId, stream) => {
			const user = session.users.get(peerId);
			if (!user) return;
			this.detachDriver(peerId);
			const driver = new LipsyncMouth(stream, {
				target: user.avatar.face,
				audioContext: this.sharedCtx
			});
			user.avatar.add(driver);
			this.drivers.set(peerId, driver);
		});
		session.voice.onTrackRemoved((peerId) => this.detachDriver(peerId));
		session.addEventListener("user-leave", (e) => {
			this.detachDriver(e.detail.user.peerId);
		});
		session.addEventListener("local-voice-state", (e) => {
			const on = e.detail.on;
			const label = on ? "🔇 Disable voice" : "🎙️ Enable voice";
			if (this.domBtn) this.domBtn.textContent = label;
			if (this.spatialBtn) this.spatialBtn.label = label;
			if (this.spatialStatus) this.spatialStatus.text = on ? "voice: on. other tabs will see your mouth" : "voice: off";
		});
		this.buildDomButton(session);
		this.buildSpatialPanel(session);
	}
	detachDriver(peerId) {
		const d = this.drivers.get(peerId);
		if (!d) return;
		d.parent?.remove(d);
		this.drivers.delete(peerId);
	}
	buildDomButton(session) {
		const btn = document.createElement("button");
		btn.textContent = "🎙️ Enable voice";
		Object.assign(btn.style, {
			position: "fixed",
			top: "12px",
			right: "12px",
			padding: "10px 18px",
			background: "#9177c7",
			color: "#fff",
			border: "none",
			borderRadius: "24px",
			fontSize: "14px",
			cursor: "pointer",
			zIndex: "999"
		});
		document.body.appendChild(btn);
		btn.addEventListener("click", () => this.toggleVoice(session));
		this.domBtn = btn;
	}
	buildSpatialPanel(session) {
		const panel = new xb.UICard({
			size: {
				width: 1,
				height: .5
			},
			manipulation: {
				actions: { translate: { faceCamera: true } },
				handle: { action: "translate" }
			},
			edge: true,
			style: { backgroundColor: "#1a1a2add" }
		});
		const content = new xb.UIPanel({ style: {
			width: "100%",
			height: "100%",
			padding: 28,
			flexDirection: "column",
			gap: 16
		} });
		content.add(new xb.UIText({
			text: "🎙️ Lipsync · netblocks",
			style: {
				color: "#bfa9ff",
				fontSize: 34,
				textAlign: "center"
			}
		}));
		this.spatialStatus = new xb.UIText({
			text: "voice: off",
			style: {
				color: "#7ac0ff",
				fontSize: 28,
				textAlign: "center"
			}
		});
		this.spatialBtn = new xb.UIButton({
			label: "🎙️ Enable voice",
			onClick: () => this.toggleVoice(session),
			style: {
				height: 76,
				backgroundColor: "#9177c7",
				color: "#ffffff",
				fontSize: 28,
				borderRadius: 18
			}
		});
		content.add(this.spatialStatus, this.spatialBtn);
		panel.add(content);
		panel.position.set(-1, 1.5, -1.4);
		panel.rotation.y = Math.PI / 8;
		this.add(panel);
	}
	async toggleVoice(session) {
		if (session.voice.isEnabled()) session.voice.disable();
		else try {
			await session.voice.enable(session.transport.remotePeerIds);
		} catch (err) {
			const msg = err.message;
			if (this.spatialStatus) this.spatialStatus.text = `voice error: ${msg}`;
		}
	}
};
NetSample.run(NetblocksLipsyncSample);
//#endregion
