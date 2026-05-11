import * as xb from 'xrblocks';
import {getVec4ByColorString} from 'xrblocks';
import * as THREE from 'three';

import {
  LanguageDetectorClient,
  languageName,
} from './LanguageDetectorClient.js';
import {GeminiLiveSource} from './SpeechSources.js';

const PLACEHOLDER =
  'Pinch the mic and say something in any language.\nEach utterance is detected separately.';
const MAX_UTTERANCES = 5;
// Approx body chars per line at the current panel width / fontSize. Used only
// for line-count estimation when sizing slots dynamically.
const CHARS_PER_LINE = 50;
// Absolute vertical fractions of the list area. Tuned so each row matches
// the actual rendered text height: label sits in a slim row, body row grows
// with line count. Gap rows between slots give visual separation; a spacer
// row at the bottom absorbs any leftover space.
const LABEL_FRAC = 0.04;
const BODY_LINE_FRAC = 0.075;
const GAP_FRAC = 0.025;
const LIST_BUDGET = 1.0;

function estimateLines(text) {
  if (!text) return 1;
  // Honour explicit \n and account for soft wrap by char count.
  const hardLines = text.split('\n');
  let total = 0;
  for (const line of hardLines) {
    total += Math.max(1, Math.ceil(line.length / CHARS_PER_LINE));
  }
  return Math.max(1, total);
}

// Curated palette per common language code; fall back to a hash-based pick
// from a fallback palette so any unseen language still gets a stable color.
const LANG_COLORS = {
  en: '#3b82f6',
  es: '#f59e0b',
  fr: '#8b5cf6',
  de: '#ef4444',
  it: '#22c55e',
  pt: '#14b8a6',
  ro: '#ec4899',
  ru: '#f97316',
  ja: '#f43f5e',
  zh: '#eab308',
  ko: '#a855f7',
  ar: '#06b6d4',
  hi: '#84cc16',
  nl: '#0ea5e9',
};
const FALLBACK_COLORS = [
  '#6366f1',
  '#d946ef',
  '#10b981',
  '#f97316',
  '#0ea5e9',
  '#facc15',
  '#fb7185',
  '#34d399',
];
function colorForLang(code) {
  if (!code) return '#64748b';
  const c = code.toLowerCase();
  if (LANG_COLORS[c]) return LANG_COLORS[c];
  let hash = 0;
  for (let i = 0; i < c.length; i++) hash = (hash * 31 + c.charCodeAt(i)) | 0;
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export class LanguageDetectorDemo extends xb.Script {
  static dependencies = {camera: THREE.Camera};

  constructor() {
    super();
  }

  init({camera}) {
    this.camera = camera;
    this.detector = new LanguageDetectorClient();
    this.detector
      .load()
      .catch((e) => console.error('Language detector failed to load:', e));

    this.source = null;
    this.listening = false;
    this.utterances = []; // [{code, name, prob, text}]
    this.interim = '';

    this._buildUi();
  }

  _buildUi() {
    const panel = new xb.SpatialPanel({
      backgroundColor: '#101218e6',
      width: 1.8,
      height: 1.3,
    });
    this.add(panel);

    const grid = panel.addGrid();

    // Slim header doubles as status / error display.
    const titleRow = grid.addRow({weight: 0.08});
    this.titleText = titleRow.addText({
      text: 'Live Language Detector',
      fontColor: '#94a3b8',
      fontSize: 0.034,
    });

    // Spacer above list.
    grid.addRow({weight: 0.04});

    // Utterance list — each slot is a 2-row card: small colored label + sentence.
    const listRow = grid.addRow({weight: 0.7});
    this.listGrid = listRow.addPanel({backgroundColor: '#00000000'}).addGrid();
    this.panel = panel;
    // Spacer at the TOP — content anchors to the bottom (chat-style: latest
    // utterance sits at a fixed position, older ones push up off-screen).
    this.spacerRow = this.listGrid.addRow({weight: 0});
    this.itemSlots = [];
    this.gapRows = [];
    for (let i = 0; i < MAX_UTTERANCES; i++) {
      if (i > 0) {
        this.gapRows.push(this.listGrid.addRow({weight: GAP_FRAC}));
      }
      const slotRow = this.listGrid.addRow({weight: 1 / MAX_UTTERANCES});
      const slotGrid = slotRow
        .addPanel({backgroundColor: '#00000000'})
        .addGrid();

      // Inner spacer at top of slot — when the slot is bigger than the
      // natural content, this absorbs the extra so content stays bottom-aligned
      // at a constant natural size.
      const innerSpacer = slotGrid.addRow({weight: 0});

      const labelRow = slotGrid.addRow({weight: LABEL_FRAC});
      const labelText = labelRow.addText({
        text: '',
        fontColor: '#94a3b8',
        fontSize: 0.018,
        textAlign: 'left',
        anchorX: 'left',
      });
      labelText.x = -0.5;

      const bodyRow = slotGrid.addRow({weight: BODY_LINE_FRAC});
      const bodyText = bodyRow.addText({
        text: '',
        fontColor: '#ffffff',
        fontSize: 0.04,
        textAlign: 'left',
        anchorX: 'left',
      });
      bodyText.x = -0.5;

      this.itemSlots.push({
        slotRow,
        slotGrid,
        innerSpacer,
        labelRow,
        labelText,
        bodyRow,
        bodyText,
        live: false,
      });
    }

    // Spacer above controls.
    grid.addRow({weight: 0.04});

    // Controls row.
    const controlRow = grid.addRow({weight: 0.14});
    const controlGrid = controlRow
      .addPanel({backgroundColor: '#00000000'})
      .addGrid();

    controlGrid.addCol({weight: 0.25});

    this.micButton = controlGrid.addCol({weight: 0.25}).addIconButton({
      text: 'mic',
      fontSize: 0.6,
      fontColor: '#ffffff',
    });
    this.micButton.onTriggered = () => this._toggleListening();

    controlGrid.addCol({weight: 0.05});

    this.clearButton = controlGrid.addCol({weight: 0.25}).addIconButton({
      text: 'delete',
      fontSize: 0.55,
      fontColor: '#ffffff',
    });
    this.clearButton.onTriggered = () => this._clear();

    controlGrid.addCol({weight: 0.2});

    panel.updateLayouts();
  }

  async _toggleListening() {
    if (this.listening) {
      await this._stop();
      this._setStatus('Stopped');
      this._setMicActive(false);
      return;
    }
    if (!GeminiLiveSource.isAvailable()) {
      this._setStatus('Gemini not enabled — add API key to keys.json');
      return;
    }
    const source = new GeminiLiveSource();
    source.onTranscript((text, isFinal) => this._onTranscript(text, isFinal));
    source.onError((err) => {
      console.error('Speech source error:', err);
      this._setStatus('Error: ' + (err?.message || err));
      this.listening = false;
      this.source = null;
      this._setMicActive(false);
    });
    try {
      await source.start();
      this.source = source;
      this.listening = true;
      this._setStatus('● Listening');
      this._setMicActive(true);
    } catch (err) {
      console.error('Failed to start:', err);
      this._setStatus('Failed to start: ' + (err?.message || err));
    }
  }

  async _stop() {
    if (this.source) {
      await this.source.stop();
      this.source = null;
    }
    this.listening = false;
  }

  _clear() {
    this.utterances = [];
    this.interim = '';
    this.source?.reset?.();
    this._renderList();
  }

  _onTranscript(text, isFinal) {
    if (!text) return;
    if (isFinal) {
      const lang = this._detect(text);
      this.utterances.push({...lang, text});
      if (this.utterances.length > MAX_UTTERANCES) this.utterances.shift();
      this.interim = '';
      this.interimLang = null;
      if (this.interimTimer) clearTimeout(this.interimTimer);
    } else {
      this.interim = text;
      // Debounce interim detection so we're not running it on every char.
      if (this.interimTimer) clearTimeout(this.interimTimer);
      this.interimTimer = setTimeout(() => {
        this.interimLang = this._detect(text);
        this._renderList();
      }, 200);
    }
    this._renderList();
  }

  _detect(text) {
    if (!this.detector?.detector || text.length < 4) {
      return {code: '??', name: '…', prob: 0};
    }
    const langs = this.detector.detect(text);
    if (!langs.length) return {code: '??', name: 'Unknown', prob: 0};
    const top = langs[0];
    return {
      code: top.languageCode.toUpperCase(),
      name: languageName(top.languageCode),
      prob: top.probability,
    };
  }

  _renderList() {
    const items = this.utterances.slice();
    if (this.interim) {
      const live = this.interimLang;
      items.push({
        code: live?.code ?? '··',
        name: live?.name ?? '…',
        prob: live?.prob ?? 0,
        text: this.interim,
        live: true,
      });
    }
    while (items.length > this.itemSlots.length) items.shift();

    // Per-slot line count: prefer troika's actual lineCount from the previous
    // sync; fall back to the char-based estimate. Then drop oldest until fit.
    const slotLines = (slot, u) => {
      if (!u) return 0;
      const actual = slot?.bodyText?.lineCount;
      const est = estimateLines(u.text);
      return Math.max(est, actual || 0);
    };

    const cost = (slot, u) => LABEL_FRAC + slotLines(slot, u) * BODY_LINE_FRAC;
    let firstIdx = Math.max(0, this.itemSlots.length - items.length);
    let total = items.reduce(
      (s, u, k) => s + cost(this.itemSlots[firstIdx + k], u),
      0
    );
    while (items.length > 1 && total > LIST_BUDGET) {
      total -= cost(this.itemSlots[firstIdx], items.shift());
      firstIdx++;
    }

    // First pass: compute raw cost per slot (label + lines*body), and total.
    const slotCosts = new Array(this.itemSlots.length).fill(0);
    const slotLineCounts = new Array(this.itemSlots.length).fill(0);
    let totalCost = 0;
    let activeCount = 0;
    for (let i = 0; i < this.itemSlots.length; i++) {
      const slot = this.itemSlots[i];
      const u = items[i];
      if (u) {
        const lines = slotLines(slot, u);
        slotLineCounts[i] = lines;
        slotCosts[i] = LABEL_FRAC + lines * BODY_LINE_FRAC;
        totalCost += slotCosts[i];
        activeCount++;
      } else if (i === 0 && !items.length) {
        slotLineCounts[i] = 2;
        slotCosts[i] = LABEL_FRAC + 2 * BODY_LINE_FRAC;
        totalCost += slotCosts[i];
        activeCount++;
      }
    }
    const gapsCost = Math.max(0, activeCount - 1) * GAP_FRAC;
    totalCost += gapsCost;
    // Scale slot rows so the list fills the area (smooth transitions, no
    // jumps). Inside each slot, label/body keep their natural fractions of
    // the list — extra space goes into an inner spacer at the top of the
    // slot, so content stays bottom-aligned at a constant size.
    const scale = totalCost > 0 ? LIST_BUDGET / totalCost : 0;

    let layoutChanged = false;
    for (let i = 0; i < this.itemSlots.length; i++) {
      const slot = this.itemSlots[i];
      const u = items[i];

      const lines = slotLineCounts[i];
      const slotW = slotCosts[i] * scale;
      // Inner weights are absolute fractions of slotGrid (which fills slotRow).
      // We want labelRow and bodyRow to have constant world-space height equal
      // to LABEL_FRAC and lines*BODY_LINE_FRAC of the listGrid. Since
      // labelRow.world = labelRow.weight * slotRow.weight * listGrid.height,
      // labelRow.weight = LABEL_FRAC / slotRow.weight = 1/scale * (LABEL_FRAC/slotCost).
      const labelW = slotW > 0 ? LABEL_FRAC / slotW : 0;
      const bodyW = slotW > 0 ? (lines * BODY_LINE_FRAC) / slotW : 0;
      const innerSpacerW = Math.max(0, 1 - labelW - bodyW);

      if (Math.abs(slot.slotRow.weight - slotW) > 1e-4) {
        slot.slotRow.weight = slotW;
        layoutChanged = true;
      }
      if (
        Math.abs(slot.labelRow.weight - labelW) > 1e-4 ||
        Math.abs(slot.bodyRow.weight - bodyW) > 1e-4 ||
        Math.abs(slot.innerSpacer.weight - innerSpacerW) > 1e-4
      ) {
        slot.innerSpacer.weight = innerSpacerW;
        slot.labelRow.weight = labelW;
        slot.bodyRow.weight = bodyW;
        layoutChanged = true;
      }

      // Gap row before this slot is only shown when both this and the prev
      // slot are in use.
      if (i > 0) {
        const gap = this.gapRows[i - 1];
        const prevActive = slotCosts[i - 1] > 0;
        const wantGap = prevActive && slotCosts[i] > 0 ? GAP_FRAC * scale : 0;
        if (Math.abs(gap.weight - wantGap) > 1e-4) {
          gap.weight = wantGap;
          layoutChanged = true;
        }
      }

      if (u) {
        const color = colorForLang(u.code);
        const name = u.name && u.name !== '…' ? u.name : u.code || '··';
        const lowConf = u.prob > 0 && u.prob < 0.7;
        const suffix = u.live ? '  •  live' : lowConf ? '  •  uncertain' : '';
        slot.labelText.setText(`■  ${name}${suffix}`);
        this._setTextColor(slot.labelText, color);
        const textChanged = slot.bodyText.text !== u.text;
        slot.bodyText.setText(u.text);
        slot.slotRow.visible = true;
        slot.live = !!u.live;
        slot._sizedFor = lines;
        if (textChanged) this._listenForLineCount(slot);
      } else if (i === 0 && !items.length) {
        slot.labelText.setText('');
        slot.bodyText.setText(PLACEHOLDER);
        slot.slotRow.visible = true;
        slot.live = false;
      } else {
        slot.labelText.setText('');
        slot.bodyText.setText('');
        slot.slotRow.visible = false;
        slot.live = false;
      }
    }

    if (Math.abs(this.spacerRow.weight - 0) > 1e-4) {
      this.spacerRow.weight = 0;
      layoutChanged = true;
    }

    if (layoutChanged) {
      for (const slot of this.itemSlots) slot.slotGrid.resetLayout();
      this.listGrid.resetLayout();
      this.panel.updateLayouts();
    }
  }

  // After troika finishes wrapping a body, if the actual lineCount is larger
  // than what we sized the slot for, re-render so the slot grows to fit.
  _listenForLineCount(slot) {
    if (slot._lineCountListener) return;
    const handler = () => {
      const actual = slot.bodyText.lineCount || 0;
      slot._lineCountListener = null;
      slot.bodyText.removeEventListener('synccomplete', handler);
      if (actual > (slot._sizedFor ?? 0)) {
        this._renderList();
      }
    };
    slot._lineCountListener = handler;
    slot.bodyText.addEventListener('synccomplete', handler);
  }

  _setTextColor(textView, colorHex) {
    textView.fontColor = colorHex;
    const obj = textView.textObj;
    if (!obj) return;
    const v = getVec4ByColorString(colorHex);
    const hex =
      (Math.round(v.x * 255) << 16) +
      (Math.round(v.y * 255) << 8) +
      Math.round(v.z * 255);
    obj.color = hex;
    if (typeof obj.sync === 'function') obj.sync();
  }

  update(time) {
    if (!this.itemSlots) return;
    const t = (time ?? performance.now()) / 1000;
    const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 4));
    for (const slot of this.itemSlots) {
      const labelObj = slot.labelText?.textObj;
      const bodyObj = slot.bodyText?.textObj;
      if (slot.live) {
        if (labelObj) labelObj.fillOpacity = pulse;
        if (bodyObj) bodyObj.fillOpacity = 0.6 + 0.4 * pulse;
      } else {
        if (labelObj && labelObj.fillOpacity !== 1) labelObj.fillOpacity = 1;
        if (bodyObj && bodyObj.fillOpacity !== 1) bodyObj.fillOpacity = 1;
      }
    }
  }

  _setStatus(message) {
    if (!this.titleText) return;
    this.titleText.setText(message);
  }

  _setMicActive(active) {
    this.micButton.setText?.(active ? 'stop' : 'mic');
  }
}
