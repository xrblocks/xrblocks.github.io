import * as THREE from "three";
import * as xb from "xrblocks";
import { Keyboard } from "xrblocks/addons/virtualkeyboard/Keyboard.js";
import { AVATAR_PALETTE, BroadcastChannelTransport, hashStringToIndex } from "xrblocks/addons/netblocks/src/index.js";
import { NetSample } from "./Sample.js";
//#region demos/netblocks/src/main.ts
/**
* IntegrationSample.
*
* The "shared room" demo. Combines every netblocks subsystem in a
* single page so you can stand in a room with another tab and:
*   - see each other as live ball-and-stick avatars (presence)
*   - grab and toss shared cubes (NetObjects with cooperative ownership)
*   - chat over the typed events bus
*   - fire shared emoji bursts (typed-events RPC) with B / grip
*   - hear each other spatialized via WebRTC voice
*
* Movement, look, and the on-screen reticle come from the standard
* xrblocks SimulatorControls (see google/xrblocks#262). The chat input
* flips `xb.core.simulator.controls.enabled` on focus so typing doesn't
* walk the avatar around — same pattern the chat sample uses. Each cube
* is tagged `draggable` so the platform's built-in DragManager handles
* translation; we only intercept `selectstart`/`selectend` to call
* `session.claim()` / `session.release()` so the network knows who owns
* what.
*/
const NUM_CUBES = 4;
const CUBE_COLORS = [
	9533383,
	8044799,
	16758891,
	8119204
];
const PARTICLES_PER_BURST = 24;
const BURST_LIFETIME_MS = 1200;
var IntegrationSample = class extends NetSample {
	_displayName = `User-${Math.floor(Math.random() * 1e3)}`;
	_cubes = [];
	_drag = null;
	_voiceOn = false;
	_log;
	_chatPanel;
	_spatialLog;
	_spatialLogLines = [];
	_spatialVoiceBtn;
	_spatialDraft;
	_keyboard;
	_ndc = new THREE.Vector2(-2, -2);
	_mouseDown = false;
	_mouseRaycaster = new THREE.Raycaster();
	_bursts = [];
	getJoinOptions() {
		return {
			roomId: "netblocks-sample-integration",
			options: {
				transport: new BroadcastChannelTransport(),
				displayName: this._displayName
			}
		};
	}
	onSession(session) {
		this._spawnCubes(session);
		this._wireMouse();
		this._buildChatPanel(session);
		this._buildVoiceButton(session);
		this._buildSpatialHud(session);
		this._wireBursts(session);
	}
	_wireMouse() {
		const canvas = xb.core?.renderer?.domElement;
		if (!canvas) return;
		const onMove = (e) => {
			const r = canvas.getBoundingClientRect();
			this._ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
		};
		const onDown = (e) => {
			if (e.button !== 0) return;
			onMove(e);
			this._mouseDown = true;
		};
		const onUp = (e) => {
			if (e.button !== 0) return;
			this._mouseDown = false;
		};
		canvas.addEventListener("pointermove", onMove);
		canvas.addEventListener("pointerdown", onDown);
		window.addEventListener("pointerup", onUp);
	}
	update(time, frame) {
		super.update(time, frame);
		const session = this.net.session;
		if (session) this._tickDrag(session);
		this._stepBursts();
	}
	_spawnCubes(session) {
		const z = -1;
		const y = 1.3;
		const xs = [
			-.45,
			-.15,
			.15,
			.45
		];
		for (let i = 0; i < NUM_CUBES; i++) {
			const cube = session.createNetObject({ id: `shared-cube-${i}` });
			cube.position.set(xs[i] ?? 0, y, z);
			const mesh = new THREE.Mesh(new THREE.BoxGeometry(.15, .15, .15), new THREE.MeshBasicMaterial({ color: CUBE_COLORS[i % CUBE_COLORS.length] }));
			const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({
				color: 0,
				transparent: true,
				opacity: .5
			}));
			edges.xb = { pointerEvents: "none" };
			mesh.add(edges);
			cube.add(mesh);
			this._cubes.push(cube);
		}
	}
	_tickDrag(session) {
		const camera = xb.core?.camera;
		if (!camera) return;
		const controllers = (xb.core?.input?.controllers ?? []).filter((c) => c && c.constructor?.name !== "MouseController" && c.userData?.connected);
		if (!this._drag) {
			if (this._mouseDown && this._ndc.x > -2) {
				const cube = this._cubeUnderMouse(camera);
				if (cube) return this._beginMouseDrag(session, cube, camera);
			}
			for (const c of controllers) {
				if (!c.userData?.selected) continue;
				const cube = this._cubeUnderController(c);
				if (!cube) continue;
				return this._beginControllerDrag(session, cube, c);
			}
			return;
		}
		const drag = this._drag;
		if (!(drag.controller === null ? this._mouseDown : !!drag.controller.userData?.selected)) {
			session.release(drag.cube);
			this._drag = null;
			return;
		}
		let targetWorld;
		if (drag.controller) {
			const ray = this._controllerRay(drag.controller);
			targetWorld = ray.origin.clone().add(ray.direction.clone().multiplyScalar(drag.distance)).add(drag.offset);
		} else {
			const cameraWorld = new THREE.Vector3();
			camera.getWorldPosition(cameraWorld);
			targetWorld = this._cursorAtDistance(camera, drag.distance, cameraWorld).add(drag.offset);
		}
		const cube = drag.cube;
		if (cube.parent) {
			cube.parent.updateMatrixWorld();
			const inv = new THREE.Matrix4().copy(cube.parent.matrixWorld).invert();
			cube.position.copy(targetWorld).applyMatrix4(inv);
		} else cube.position.copy(targetWorld);
	}
	_beginMouseDrag(session, cube, camera) {
		const cameraWorld = new THREE.Vector3();
		camera.getWorldPosition(cameraWorld);
		const cubeWorld = new THREE.Vector3();
		cube.getWorldPosition(cubeWorld);
		const distance = cameraWorld.distanceTo(cubeWorld);
		const cursorWorld = this._cursorAtDistance(camera, distance, cameraWorld);
		const offset = cubeWorld.clone().sub(cursorWorld);
		session.claim(cube);
		this._drag = {
			cube,
			distance,
			offset,
			controller: null
		};
	}
	_beginControllerDrag(session, cube, controller) {
		const ray = this._controllerRay(controller);
		const cubeWorld = new THREE.Vector3();
		cube.getWorldPosition(cubeWorld);
		const distance = ray.origin.distanceTo(cubeWorld);
		const onRay = ray.origin.clone().add(ray.direction.clone().multiplyScalar(distance));
		const offset = cubeWorld.clone().sub(onRay);
		session.claim(cube);
		this._drag = {
			cube,
			distance,
			offset,
			controller
		};
	}
	_controllerRay(controller) {
		controller.updateMatrixWorld();
		const origin = new THREE.Vector3();
		controller.getWorldPosition(origin);
		const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(controller.getWorldQuaternion(new THREE.Quaternion()));
		return new THREE.Ray(origin, direction);
	}
	_cubeUnderController(controller) {
		const ray = this._controllerRay(controller);
		let best;
		let bestDist = .15;
		const tmp = new THREE.Vector3();
		for (const cube of this._cubes) {
			cube.getWorldPosition(tmp);
			const along = tmp.clone().sub(ray.origin).dot(ray.direction);
			if (along <= 0) continue;
			const d = ray.origin.clone().add(ray.direction.clone().multiplyScalar(along)).distanceTo(tmp);
			if (d < bestDist) {
				bestDist = d;
				best = cube;
			}
		}
		return best;
	}
	_cursorAtDistance(camera, distance, cameraWorld) {
		this._mouseRaycaster.setFromCamera(this._ndc, camera);
		const dir = this._mouseRaycaster.ray.direction;
		return cameraWorld.clone().add(dir.clone().multiplyScalar(distance));
	}
	_cubeUnderMouse(camera) {
		const camPos = new THREE.Vector3();
		camera.getWorldPosition(camPos);
		let best;
		let bestDist = Infinity;
		const tmp = new THREE.Vector3();
		for (const cube of this._cubes) {
			cube.getWorldPosition(tmp);
			tmp.project(camera);
			if (tmp.z > 1) continue;
			const dx = tmp.x - this._ndc.x;
			const dy = tmp.y - this._ndc.y;
			const d = Math.hypot(dx, dy);
			if (d > .15) continue;
			if (d < bestDist) {
				bestDist = d;
				best = cube;
			}
		}
		return best;
	}
	_buildChatPanel(session) {
		const panel = document.createElement("div");
		Object.assign(panel.style, {
			position: "fixed",
			top: "20px",
			right: "20px",
			width: "320px",
			maxHeight: "60vh",
			display: "flex",
			flexDirection: "column",
			background: "rgba(20, 20, 30, 0.85)",
			color: "#fff",
			borderRadius: "12px",
			padding: "10px",
			font: "13px system-ui, sans-serif",
			backdropFilter: "blur(8px)",
			zIndex: "999",
			userSelect: "none",
			WebkitUserSelect: "none"
		});
		const header = document.createElement("div");
		header.textContent = `💬 ${this._displayName}`;
		Object.assign(header.style, {
			fontWeight: "600",
			marginBottom: "6px",
			color: "#bfa9ff"
		});
		panel.appendChild(header);
		const log = document.createElement("div");
		Object.assign(log.style, {
			flex: "1 1 auto",
			overflowY: "auto",
			minHeight: "120px",
			padding: "4px 0"
		});
		panel.appendChild(log);
		this._log = log;
		this._chatPanel = panel;
		const inputRow = document.createElement("form");
		Object.assign(inputRow.style, {
			display: "flex",
			gap: "6px",
			marginTop: "6px"
		});
		const input = document.createElement("input");
		input.type = "text";
		input.placeholder = "Say something…";
		input.maxLength = 280;
		Object.assign(input.style, {
			flex: "1 1 auto",
			padding: "6px 10px",
			borderRadius: "6px",
			border: "1px solid #444",
			background: "#13141c",
			color: "#fff",
			font: "inherit",
			userSelect: "text",
			WebkitUserSelect: "text"
		});
		const send = document.createElement("button");
		send.type = "submit";
		send.textContent = "Send";
		Object.assign(send.style, {
			padding: "6px 14px",
			borderRadius: "6px",
			border: "none",
			background: "#9177c7",
			color: "#fff",
			cursor: "pointer",
			font: "inherit"
		});
		inputRow.appendChild(input);
		inputRow.appendChild(send);
		panel.appendChild(inputRow);
		document.body.appendChild(panel);
		const controls = xb.core?.simulator?.controls;
		input.addEventListener("focus", () => {
			if (controls) controls.enabled = false;
		});
		input.addEventListener("blur", () => {
			if (controls) controls.enabled = true;
		});
		inputRow.addEventListener("submit", (e) => {
			e.preventDefault();
			const text = input.value.trim();
			if (!text) return;
			const payload = {
				from: this._displayName,
				fromId: session.localPeerId,
				text,
				ts: Date.now()
			};
			session.events.emit("chat-message", payload);
			this._appendLine(payload, true);
			input.value = "";
		});
		session.events.on("chat-message", (payload) => this._appendLine(payload, false));
	}
	_appendLine(p, self) {
		if (this._log) {
			const line = document.createElement("div");
			line.style.padding = "2px 0";
			const who = document.createElement("span");
			who.textContent = self ? "you" : p.from;
			const colorHex = self ? "#9177c7" : "#" + AVATAR_PALETTE[hashStringToIndex(p.fromId, AVATAR_PALETTE.length)].toString(16).padStart(6, "0");
			who.style.color = colorHex;
			who.style.fontWeight = "600";
			line.appendChild(who);
			line.appendChild(document.createTextNode(`: ${p.text}`));
			this._log.appendChild(line);
			this._log.scrollTop = this._log.scrollHeight;
		}
		this._appendSpatialLine(`${self ? "you" : p.from}: ${p.text}`);
	}
	_appendSpatialLine(text) {
		if (!this._spatialLog) return;
		this._spatialLogLines.push(text);
		if (this._spatialLogLines.length > 12) this._spatialLogLines.shift();
		this._spatialLog.text = this._spatialLogLines.join("\n");
	}
	_buildSpatialHud(session) {
		this._spatialLog = new xb.UIText({
			text: "(start typing on the keyboard below to chat)",
			style: {
				width: "100%",
				flexGrow: 1,
				minHeight: 150,
				color: "#ffffff",
				fontSize: 20,
				whiteSpace: "pre-line",
				verticalAlign: "bottom",
				overflow: "hidden"
			}
		});
		this._spatialDraft = new xb.UIText({
			text: "› ",
			style: {
				width: "100%",
				minHeight: 36,
				color: "#7ac0ff",
				fontSize: 22
			}
		});
		this._spatialVoiceBtn = new xb.UIButton({
			label: "Enable voice",
			icon: "mic",
			style: {
				width: "100%",
				minHeight: 52,
				backgroundColor: "#9177c7"
			},
			onClick: () => this._toggleVoice(session)
		});
		const keyboard = new Keyboard({
			onValueChange: (text) => {
				if (this._spatialDraft) this._spatialDraft.text = `› ${text}`;
			},
			onSubmit: (text) => {
				const trimmed = text.trim();
				if (!trimmed) return;
				const payload = {
					from: this._displayName,
					fromId: session.localPeerId,
					text: trimmed,
					ts: Date.now()
				};
				session.events.emit("chat-message", payload);
				this._appendLine(payload, true);
				keyboard.setValue("");
				if (this._spatialDraft) this._spatialDraft.text = "› ";
			}
		});
		this._keyboard = keyboard;
		const card = new xb.UICard({
			size: {
				width: 1,
				height: .98
			},
			manipulation: true,
			edge: true,
			style: {
				flexDirection: "column",
				gap: 12,
				padding: 20,
				backgroundColor: "#1a1a2add",
				borderRadius: 24
			},
			children: [
				new xb.UIText({
					text: `💬 ${this._displayName}`,
					style: {
						width: "100%",
						color: "#bfa9ff",
						fontSize: 26,
						fontWeight: "bold",
						textAlign: "center"
					}
				}),
				this._spatialLog,
				this._spatialDraft,
				this._spatialVoiceBtn,
				keyboard
			]
		});
		card.position.set(-.8, 1.4, -1.3);
		card.rotation.y = Math.PI / 8;
		this.add(card);
	}
	async _toggleVoice(session) {
		if (this._voiceOn) {
			session.voice.disable();
			this._voiceOn = false;
			if (this._spatialVoiceBtn) {
				this._spatialVoiceBtn.label = "Enable voice";
				this._spatialVoiceBtn.icon = "mic";
			}
		} else try {
			await session.voice.enable(session.transport.remotePeerIds);
			this._voiceOn = true;
			if (this._spatialVoiceBtn) {
				this._spatialVoiceBtn.label = "Disable voice";
				this._spatialVoiceBtn.icon = "mic_off";
			}
		} catch (err) {
			this._appendSpatialLine(`voice error: ${err.message}`);
		}
	}
	_buildVoiceButton(session) {
		const btn = document.createElement("button");
		btn.textContent = "🎙️ Enable voice";
		Object.assign(btn.style, {
			marginTop: "8px",
			padding: "8px 14px",
			background: "#9177c7",
			color: "#fff",
			border: "none",
			borderRadius: "20px",
			fontSize: "13px",
			cursor: "pointer",
			alignSelf: "flex-start"
		});
		(this._chatPanel ?? document.body).appendChild(btn);
		btn.addEventListener("click", async () => {
			await this._toggleVoice(session);
			btn.textContent = this._voiceOn ? "🔇 Disable voice" : "🎙️ Enable voice";
		});
	}
	_wireBursts(session) {
		session.events.on("emoji-burst", (p) => this._spawnBurst(p));
		const fire = (origin) => {
			const payload = {
				x: origin.x,
				y: origin.y,
				z: origin.z,
				hue: Math.random()
			};
			session.events.emit("emoji-burst", payload);
			this._spawnBurst(payload);
		};
		window.addEventListener("keydown", (e) => {
			if (e.key !== "b" && e.key !== "B") return;
			const t = e.target;
			if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
			const cam = xb.core?.camera;
			if (!cam) return;
			const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
			fire(cam.position.clone().add(fwd.multiplyScalar(1.2)));
		});
		xb.core?.input?.bindSqueezeStart?.((event) => {
			const ctrl = event.target;
			if (!ctrl) return;
			fire(ctrl.getWorldPosition(new THREE.Vector3()));
		});
	}
	_spawnBurst(p) {
		const positions = /* @__PURE__ */ new Float32Array(72);
		const velocities = /* @__PURE__ */ new Float32Array(72);
		for (let i = 0; i < PARTICLES_PER_BURST; i++) {
			positions[i * 3] = p.x;
			positions[i * 3 + 1] = p.y;
			positions[i * 3 + 2] = p.z;
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			const speed = .4 + Math.random() * .4;
			velocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
			velocities[i * 3 + 1] = speed * Math.cos(phi) + .4;
			velocities[i * 3 + 2] = speed * Math.sin(phi) * Math.sin(theta);
		}
		const geom = new THREE.BufferGeometry();
		geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		const color = new THREE.Color().setHSL(p.hue, .85, .6);
		const mat = new THREE.PointsMaterial({
			color,
			size: .04,
			transparent: true
		});
		const points = new THREE.Points(geom, mat);
		this.add(points);
		this._bursts.push({
			points,
			velocities,
			bornAt: performance.now()
		});
	}
	_stepBursts() {
		const now = performance.now();
		const dt = 1 / 60;
		for (let i = this._bursts.length - 1; i >= 0; i--) {
			const b = this._bursts[i];
			const age = now - b.bornAt;
			if (age > BURST_LIFETIME_MS) {
				this.remove(b.points);
				b.points.geometry.dispose();
				b.points.material.dispose();
				this._bursts.splice(i, 1);
				continue;
			}
			const pos = b.points.geometry.getAttribute("position");
			for (let j = 0; j < pos.count; j++) {
				pos.setXYZ(j, pos.getX(j) + b.velocities[j * 3] * dt, pos.getY(j) + b.velocities[j * 3 + 1] * dt - .6 * dt, pos.getZ(j) + b.velocities[j * 3 + 2] * dt);
				b.velocities[j * 3 + 1] -= 1.5 * dt;
			}
			pos.needsUpdate = true;
			b.points.material.opacity = 1 - age / BURST_LIFETIME_MS;
		}
	}
};
NetSample.run(IntegrationSample);
//#endregion
