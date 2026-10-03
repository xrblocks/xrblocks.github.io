import * as THREE from "three";
import * as xb from "xrblocks";
import { GenerativeObjects } from "./GenerativeObjects.js";
import { GeminiVoiceInput } from "./GeminiVoice.js";
import { runCleanupSteps } from "./cleanup.js";
import { resolveApiKey } from "./ApiKey.js";
//#region demos/generative_object/src/main.ts
const PRESET_PROMPTS = [
	"a small friendly red dragon",
	"a potted succulent plant",
	"a vintage robot toy",
	"a slice of watermelon",
	"a rubber duck wearing sunglasses",
	"a paper airplane"
];
const SPEAK_LABELS = {
	idle: "🎙️ Speak",
	starting: "⏳ Starting mic...",
	recording: "🔴 Tap to send",
	transcribing: "✍️ Transcribing..."
};
var GenerativeObjectDemo = class extends xb.Script {
	generative;
	presetIndex = 0;
	busy = false;
	voice = null;
	domSpeakButton = null;
	xrStatusText = null;
	card = null;
	controls = null;
	domEvents = null;
	lights = [];
	disposed = true;
	request = 0;
	/**
	* @param generative - The demo-owned generative helper, added to the engine
	*     separately so its dependencies (AI, camera, scene, depth) are injected.
	*/
	constructor(generative) {
		super();
		this.generative = generative;
	}
	init() {
		this.disposed = false;
		this.request++;
		const ambient = new THREE.AmbientLight(16777215, 1.2);
		const key = new THREE.DirectionalLight(16777215, 1.5);
		this.lights = [ambient, key];
		key.position.set(.5, 1, 1);
		xb.core.scene.add(ambient, key);
		this.voice = new GeminiVoiceInput({
			getAI: () => xb.core.ai,
			onStateChange: (state) => this.onVoiceState_(state),
			onTranscript: (transcript) => {
				if (this.disposed) return;
				if (this.busy) {
					this.setStatus_(`heard "${transcript}", but a summon is still running.`);
					return;
				}
				this.imagine(transcript);
			},
			onError: (error) => {
				if (!this.disposed) this.setStatus_(error.message);
			}
		});
		this.buildDomControls_();
		this.buildSpatialPanel_();
		this.setStatus_("summon an object with the buttons or your voice.");
	}
	summonPreset_() {
		if (this.disposed) return;
		const prompt = PRESET_PROMPTS[this.presetIndex % PRESET_PROMPTS.length];
		this.presetIndex++;
		this.imagine(prompt);
	}
	toggleSpeak_() {
		if (this.disposed || !this.voice) return;
		if (this.voice.state === "recording") this.voice.finish();
		else if (this.voice.state === "idle") this.voice.start();
		else if (this.voice.cancel()) this.setStatus_("voice cancelled.");
	}
	onVoiceState_(state) {
		if (this.disposed) return;
		if (this.domSpeakButton) this.domSpeakButton.textContent = SPEAK_LABELS[state];
		if (state === "starting") this.setStatus_("waiting for the microphone...");
		else if (state === "recording") this.setStatus_("listening... tap speak again when you're done.");
		else if (state === "transcribing") this.setStatus_("transcribing...");
	}
	toggleRelief_() {
		if (this.disposed) return;
		const opts = this.generative.options;
		opts.relief = !opts.relief;
		opts.billboard = !opts.relief;
		this.setStatus_(opts.relief ? "relief ON (2.5D). summon something; billboarding paused to orbit it." : "relief OFF (flat cutout). billboarding back on.");
	}
	clearObjects_() {
		if (this.disposed) return;
		this.request++;
		this.busy = false;
		this.voice?.cancel();
		try {
			this.generative.clearObjects();
			this.setStatus_("cleared. summon something new.");
		} catch (error) {
			console.error("[generative_object]", error);
			this.setStatus_("could not release every object. check the console.");
		}
	}
	async imagine(prompt) {
		if (this.disposed || this.busy) return;
		if (!this.generative.isSupported) {
			this.setStatus_("generation unavailable. check your Gemini key.");
			return;
		}
		this.busy = true;
		const request = this.request;
		this.setStatus_(`summoning "${prompt}"...`);
		try {
			const object = await this.generative.imagine(prompt);
			if (this.disposed || request !== this.request) return;
			this.setStatus_(object ? `summoned "${prompt}". grab to move it. summon more anytime.` : `couldn't generate "${prompt}". try again.`);
		} catch (error) {
			if (this.disposed || request !== this.request) return;
			console.error("[generative_object]", error);
			this.setStatus_(`error generating "${prompt}".`);
		} finally {
			if (request === this.request) this.busy = false;
		}
	}
	onKeyDown(event) {
		if (event.code === "KeyG") this.summonPreset_();
		else if (event.code === "KeyR") this.toggleRelief_();
	}
	buildDomControls_() {
		const bar = document.createElement("div");
		this.controls = bar;
		this.domEvents = new AbortController();
		Object.assign(bar.style, {
			position: "fixed",
			top: "12px",
			right: "12px",
			display: "flex",
			flexDirection: "column",
			gap: "10px",
			zIndex: "999"
		});
		bar.appendChild(this.makeDomButton_("✨ Summon", () => this.summonPreset_()));
		this.domSpeakButton = this.makeDomButton_("🎙️ Speak", () => this.toggleSpeak_());
		bar.appendChild(this.domSpeakButton);
		bar.appendChild(this.makeDomButton_("🌀 Relief", () => this.toggleRelief_()));
		bar.appendChild(this.makeDomButton_("🗑️ Clear", () => this.clearObjects_()));
		document.body.appendChild(bar);
	}
	makeDomButton_(label, onClick) {
		const button = document.createElement("button");
		button.textContent = label;
		Object.assign(button.style, {
			padding: "10px 18px",
			background: "#9177c7",
			color: "#fff",
			border: "none",
			borderRadius: "24px",
			fontSize: "14px",
			cursor: "pointer"
		});
		button.addEventListener("click", onClick, { signal: this.domEvents.signal });
		return button;
	}
	buildSpatialPanel_() {
		const card = new xb.UICard({
			size: {
				width: .62,
				height: .24
			},
			manipulation: {
				actions: { translate: { faceCamera: true } },
				handle: { action: "translate" }
			},
			edge: true,
			style: {
				backgroundColor: "rgba(16, 14, 26, 0.94)",
				borderWidth: 2,
				borderColor: "rgba(145, 119, 199, 0.55)",
				borderRadius: 18,
				padding: 14,
				flexDirection: "column",
				gap: 8,
				alignItems: "stretch",
				justifyContent: "center"
			}
		});
		this.card = card;
		card.name = "GenerativeObjectControlCard";
		card.position.set(0, 1.3, -.8);
		this.add(card);
		card.add(new xb.UIText({
			text: "GENERATIVE OBJECTS",
			style: {
				fontSize: 18,
				fontWeight: "bold",
				color: "#c4b5ff",
				textAlign: "center",
				width: "100%"
			}
		}));
		this.xrStatusText = new xb.UIText({
			text: "idle",
			style: {
				fontSize: 12,
				color: "#8b97a7",
				textAlign: "center",
				width: "100%"
			}
		});
		card.add(this.xrStatusText);
		card.add(new xb.UIPanel({ style: {
			width: "100%",
			height: 1,
			backgroundColor: "rgba(255, 255, 255, 0.10)"
		} }));
		const row = new xb.UIPanel({ style: {
			width: "100%",
			flexDirection: "row",
			gap: 10,
			justifyContent: "center",
			alignItems: "center"
		} });
		row.add(this.makeXrButton_("flare", "summon", () => this.summonPreset_()));
		row.add(this.makeXrButton_("mic", "speak", () => this.toggleSpeak_()));
		row.add(this.makeXrButton_("deployed_code", "relief", () => this.toggleRelief_()));
		row.add(this.makeXrButton_("delete_sweep", "clear", () => this.clearObjects_()));
		card.add(row, new xb.FollowHead({
			offset: new THREE.Vector3(0, .3, -1),
			smoothing: .08
		}));
	}
	makeXrButton_(iconName, label, onClick) {
		return new xb.UIButton({
			label,
			icon: iconName,
			onClick,
			style: {
				paddingTop: 8,
				paddingBottom: 8,
				paddingLeft: 16,
				paddingRight: 16,
				borderRadius: 12,
				backgroundColor: "#3a3550",
				borderWidth: 1,
				borderColor: "#6b5fa0",
				color: "#ffffff",
				fontSize: 14,
				fontWeight: "bold",
				":hover": { backgroundColor: "#7a5fc7" },
				":active": { backgroundColor: "#b49aff" }
			}
		});
	}
	setStatus_(text) {
		if (this.disposed) return;
		console.log("[generative_object]", text);
		const el = document.getElementById("status");
		if (el) el.textContent = text;
		if (this.xrStatusText) this.xrStatusText.text = text.replace(/…/g, "...");
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.request++;
		const voice = this.voice;
		const controls = this.controls;
		const domEvents = this.domEvents;
		const card = this.card;
		const lights = this.lights;
		this.voice = null;
		this.busy = false;
		this.controls = null;
		this.domEvents = null;
		this.card = null;
		this.domSpeakButton = null;
		this.xrStatusText = null;
		this.lights = [];
		runCleanupSteps([
			() => voice?.dispose(),
			() => domEvents?.abort(),
			() => controls?.remove(),
			() => this.generative.clearObjects(),
			() => card?.removeFromParent(),
			...lights.flatMap((light) => [() => light.removeFromParent(), () => light.dispose()])
		]);
	}
};
async function start() {
	const urlKey = window.generativeObjectUrlKey;
	delete window.generativeObjectUrlKey;
	const apiKey = await resolveApiKey(urlKey);
	const options = new xb.Options();
	options.enableAI();
	options.ai.gemini.apiKey = apiKey;
	options.reticles.enabled = true;
	options.depth.enabled = true;
	options.depth.depthMesh.enabled = true;
	options.depth.depthTexture.enabled = true;
	options.depth.occlusion.enabled = true;
	options.sound.speechRecognizer.enabled = false;
	options.setAppTitle("Generative Object");
	options.setAppDescription("Summon AI-generated objects onto the surfaces around you with buttons or voice, then grab them. Enter a prototype Gemini key to start.");
	options.xrButton.showEnterSimulatorButton = true;
	const generative = new GenerativeObjects();
	xb.add(generative);
	xb.add(new GenerativeObjectDemo(generative));
	await xb.init(options);
}
//#endregion
export { GenerativeObjectDemo, start };
