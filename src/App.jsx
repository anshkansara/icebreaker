import { useState, useEffect, useRef } from "react";

const CATEGORY_META = {
  Truth:      { emoji: "🔍", light: "#EEF4FF", dark: "#3B6FD4" },
  Dare:       { emoji: "🔥", light: "#FFF1EE", dark: "#D4472A" },
  Action:     { emoji: "⚡", light: "#EEFBF3", dark: "#2A9D5C" },
  Punishment: { emoji: "💀", light: "#F5EEFF", dark: "#7C3AED" },
  Wildcard:   { emoji: "🃏", light: "#FFFBEE", dark: "#C49A00" },
};
const CATEGORIES = Object.keys(CATEGORY_META);

function genId() { return Math.random().toString(36).slice(2, 9); }

function makeCard(cat = "Truth", text = "") {
  return { id: genId(), category: cat, text };
}

function createDefaultSets() {
  return [
    {
      id: genId(), name: "Warm-Up", unlockAt: 0, enabled: true,
      cards: [
        makeCard("Truth", "What's the most embarrassing thing you've done?"),
        makeCard("Truth", "Who here would you call at 3am?"),
        makeCard("Dare",  "Do your best celebrity impression"),
        makeCard("Action","Everyone does 10 pushups"),
      ],
    },
    {
      id: genId(), name: "Getting Spicy", unlockAt: 5, enabled: true,
      cards: [
        makeCard("Truth",      "What's a secret you've never told anyone?"),
        makeCard("Dare",       "Text your crush something sweet"),
        makeCard("Punishment", "Finish your drink"),
        makeCard("Wildcard",   "Everyone at the table draws a card"),
      ],
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT QUESTION SET
// ---------------------------------------------------------------------------
// Paste a full exported pack here — the exact JSON you get from the
// "Export pack" button — replacing the PASTE_EXPORTED_PACK_HERE placeholder
// between the backticks below. Then the "Use default set" button in the app
// will load it. Leave the placeholder as-is to disable the default option.
//
// It accepts either a full export object ({ "name": ..., "sets": [...] })
// or a bare array of sets. Avoid backticks (`) and ${ inside card text.
// ═══════════════════════════════════════════════════════════════════════════
const DEFAULT_PACK_JSON = `
PASTE_EXPORTED_PACK_HERE
`;

// Regenerate all ids so loading a pack never collides with existing ids.
function normalizeSets(sets) {
  return sets.map(s => ({
    ...s,
    id: genId(),
    cards: (s.cards || []).map(c => ({ ...c, id: genId() })),
  }));
}

// Parse the hardcoded default pack once. Returns { name, sets } or null
// if it's still the placeholder / unparseable / empty.
function getDefaultPack() {
  try {
    const parsed = JSON.parse(DEFAULT_PACK_JSON);
    const sets = Array.isArray(parsed) ? parsed : parsed.sets;
    if (!Array.isArray(sets) || !sets.length) return null;
    const name = (!Array.isArray(parsed) && parsed.name) ? parsed.name : "Default Set";
    return { name, sets };
  } catch {
    return null;
  }
}
const DEFAULT_PACK = getDefaultPack();

// ── dominant category for a set (used for set icon in list)
function dominantCat(cards) {
  const counts = {};
  cards.forEach(c => { counts[c.category] = (counts[c.category] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Truth";
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.g-app { font-family: 'Nunito', sans-serif; background: #F7F6FB; min-height: 100vh; color: #1C1B2E; }

/* ── SETUP ── */
.g-setup { max-width: 480px; margin: 0 auto; padding-bottom: 100px; }

.g-header {
  background: #fff; border-bottom: 1.5px solid #EBEBF5;
  padding: 18px 20px 14px; position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
}
.g-title {
  font-size: 22px; font-weight: 900; letter-spacing: -0.5px;
  background: linear-gradient(110deg, #7C3AED, #EC4899);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.g-header-meta { font-size: 13px; color: #888; font-weight: 600; }

.g-how {
  margin: 16px 16px 0; background: #EEF4FF;
  border-radius: 14px; padding: 14px 16px; border: 1.5px solid #C7D9FF;
}
.g-how-title { font-size: 13px; font-weight: 800; color: #3B6FD4; margin-bottom: 6px; }
.g-how-step { font-size: 12px; color: #4A5E8A; font-weight: 600; display: flex; align-items: flex-start; gap: 6px; line-height: 1.4; margin-bottom: 4px; }

.g-section-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 16px 10px; }
.g-section-title { font-size: 16px; font-weight: 800; }
.g-section-sub   { font-size: 12px; color: #999; font-weight: 600; }

/* Import / Export bar */
.g-io-bar {
  display: flex; gap: 8px; padding: 12px 16px 0;
}
.g-io-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 12px; border-radius: 10px; border: 1.5px solid #E8E7F2;
  background: #fff; font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 700;
  color: #555; cursor: pointer; transition: all 0.15s;
}
.g-io-btn:hover { border-color: #7C3AED; color: #7C3AED; background: #F5F3FF; }
.g-io-btn.import { border-color: #C7D9FF; color: #3B6FD4; background: #EEF4FF; }
.g-io-btn.import:hover { border-color: #3B6FD4; background: #E0ECFF; }
.g-io-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.g-io-btn:disabled:hover { border-color: #E8E7F2; color: #555; background: #fff; }

/* Use-default button (own row) */
.g-default-bar { padding: 8px 16px 0; }
.g-default-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 11px 12px; border-radius: 10px; border: 1.5px solid #D4C9FF;
  background: #F5F3FF; font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 800;
  color: #7C3AED; cursor: pointer; transition: all 0.15s;
}
.g-default-btn:hover { border-color: #7C3AED; background: #EDE9FE; }
.g-default-btn:disabled { opacity: 0.45; cursor: not-allowed; background: #F5F3FF; }

/* Active-pack indicator */
.g-pack-source {
  margin: 12px 16px 0; display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 12px;
  background: #fff; border: 1.5px solid #EBEBF5;
}
.g-pack-source-dot { width: 8px; height: 8px; border-radius: 50%; background: #7C3AED; flex-shrink: 0; }
.g-pack-source-label { font-size: 11px; font-weight: 800; color: #BBB; text-transform: uppercase; letter-spacing: 0.8px; }
.g-pack-source-name { font-size: 13px; font-weight: 800; color: #1C1B2E; margin-left: auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Set card */
.g-set { margin: 0 16px 10px; background: #fff; border-radius: 16px; border: 1.5px solid #EBEBF5; overflow: hidden; transition: border-color 0.15s, box-shadow 0.15s; }
.g-set:hover { border-color: #D4C9FF; }
.g-set.g-set-open { border-color: #7C3AED; box-shadow: 0 0 0 3px rgba(124,58,237,0.08); }
.g-set.g-set-off  { opacity: 0.55; }

.g-set-row { display: flex; align-items: center; gap: 10px; padding: 14px 16px; cursor: pointer; user-select: none; }
.g-set-emoji { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.g-set-info { flex: 1; min-width: 0; }
.g-set-name { font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.g-set-sub  { font-size: 12px; color: #999; font-weight: 600; margin-top: 1px; }
.g-set-chips { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.g-chip { font-size: 11px; font-weight: 700; padding: 4px 9px; border-radius: 20px; white-space: nowrap; }
.g-chip-lock { background: #FFF3CD; color: #856404; }
.g-chip-off  { background: #F0F0F0; color: #999; }
.g-chevron { color: #CCC; font-size: 12px; transition: transform 0.2s; flex-shrink: 0; }
.g-chevron.open { transform: rotate(180deg); }

/* Body */
.g-set-body { border-top: 1.5px solid #F0EFF8; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.g-field { display: flex; flex-direction: column; gap: 6px; }
.g-label { font-size: 11px; font-weight: 800; color: #999; text-transform: uppercase; letter-spacing: 0.8px; }
.g-label-hint { font-size: 11px; color: #BBB; font-weight: 600; text-transform: none; letter-spacing: 0; margin-left: 4px; }
.g-input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #E8E7F2; background: #FAFAFA; color: #1C1B2E; font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 600; outline: none; transition: border-color 0.15s; }
.g-input:focus { border-color: #7C3AED; background: #fff; }

/* Stepper */
.g-stepper { display: flex; align-items: center; background: #FAFAFA; border: 1.5px solid #E8E7F2; border-radius: 10px; overflow: hidden; height: 44px; }
.g-step-btn { width: 44px; height: 44px; border: none; background: transparent; font-size: 20px; cursor: pointer; color: #666; display: flex; align-items: center; justify-content: center; transition: background 0.1s; flex-shrink: 0; }
.g-step-btn:hover { background: #F0EEF8; }
.g-step-val { flex: 1; text-align: center; font-size: 18px; font-weight: 800; border-left: 1.5px solid #E8E7F2; border-right: 1.5px solid #E8E7F2; }
.g-step-note { font-size: 12px; color: #888; font-weight: 700; padding: 8px 12px; background: #F0EEF8; border-radius: 8px; text-align: center; }
.g-step-note.active { background: #EFF9F4; color: #2A7A4F; }

/* Prompts list */
.g-prompts { display: flex; flex-direction: column; gap: 8px; }

.g-prompt-card {
  border: 1.5px solid #EBEBF5; border-radius: 12px;
  background: #FAFAFA; overflow: hidden; transition: border-color 0.15s;
}
.g-prompt-card:focus-within { border-color: #C4B5FD; background: #fff; }

.g-prompt-top {
  display: flex; align-items: center; gap: 0;
  border-bottom: 1.5px solid #F0EFF8;
}

/* Inline category tabs on each prompt */
.g-prompt-cats { display: flex; flex: 1; overflow-x: auto; scrollbar-width: none; }
.g-prompt-cats::-webkit-scrollbar { display: none; }
.g-pcat-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 7px 10px; border: none; background: transparent;
  font-family: 'Nunito', sans-serif; font-size: 11px; font-weight: 800;
  color: #BBB; cursor: pointer; white-space: nowrap; transition: all 0.12s;
  border-right: 1px solid #F0EFF8; flex-shrink: 0;
}
.g-pcat-btn:last-child { border-right: none; }
.g-pcat-btn:hover { color: #7C3AED; background: #F5F3FF; }
.g-pcat-btn.active { color: var(--pcat-dark); background: var(--pcat-light); }
.g-pcat-emoji { font-size: 13px; }

.g-prompt-del-btn {
  width: 36px; height: 36px; border: none; background: transparent;
  color: #DDD; font-size: 18px; cursor: pointer; display: flex;
  align-items: center; justify-content: center; flex-shrink: 0;
  transition: color 0.15s; border-left: 1px solid #F0EFF8;
}
.g-prompt-del-btn:hover { color: #F87171; }

.g-prompt-body { padding: 8px 12px; }
.g-prompt-textarea {
  width: 100%; background: transparent; border: none;
  color: #1C1B2E; font-family: 'Nunito', sans-serif;
  font-size: 13px; font-weight: 600; outline: none; resize: none;
  line-height: 1.5; padding: 0;
}

.g-add-prompt {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px; border-radius: 10px; border: 1.5px dashed #D4C9FF;
  background: transparent; color: #9B7FE0;
  font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.15s; width: 100%;
}
.g-add-prompt:hover { border-color: #7C3AED; background: #F5F3FF; }

/* Set footer */
.g-set-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 4px; }
.g-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 700; color: #666; user-select: none; }
.g-toggle-track { width: 40px; height: 22px; border-radius: 11px; background: #E0DDED; position: relative; transition: background 0.2s; flex-shrink: 0; }
.g-toggle-track.on { background: #7C3AED; }
.g-toggle-thumb { width: 18px; height: 18px; border-radius: 50%; background: #fff; position: absolute; top: 2px; left: 2px; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.g-toggle-track.on .g-toggle-thumb { left: 20px; }
.g-del-btn { padding: 7px 14px; border-radius: 8px; border: 1.5px solid #FECACA; background: transparent; color: #F87171; font-family: 'Nunito', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
.g-del-btn:hover { background: #FFF0F0; border-color: #F87171; }

.g-add-set { margin: 4px 16px; padding: 14px; border-radius: 14px; border: 2px dashed #D4C9FF; background: transparent; color: #9B7FE0; font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 800; cursor: pointer; width: calc(100% - 32px); transition: all 0.2s; }
.g-add-set:hover { border-color: #7C3AED; background: #F5F3FF; color: #7C3AED; }

.g-play { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); padding: 16px 52px; border-radius: 50px; border: none; background: linear-gradient(120deg, #7C3AED, #EC4899); color: #fff; font-family: 'Nunito', sans-serif; font-size: 16px; font-weight: 900; cursor: pointer; transition: all 0.2s; white-space: nowrap; box-shadow: 0 6px 24px rgba(124,58,237,0.35); }
.g-play:hover { transform: translateX(-50%) scale(1.04); }
.g-play:disabled { opacity: 0.4; cursor: not-allowed; transform: translateX(-50%); box-shadow: none; }

/* ── GAME ── */
.g-game { max-width: 480px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; background: #F7F6FB; }
.g-game-bar { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 10px; background: #fff; border-bottom: 1.5px solid #EBEBF5; }
.g-back { padding: 8px 14px; border-radius: 10px; border: 1.5px solid #E8E7F2; background: transparent; color: #666; font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
.g-back:hover { border-color: #7C3AED; color: #7C3AED; }
.g-pull-badge { background: #F5F3FF; color: #7C3AED; border-radius: 20px; padding: 6px 14px; font-size: 13px; font-weight: 800; }

.g-active-sets { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 16px 8px; }
.g-set-pill { font-size: 11px; font-weight: 800; padding: 4px 11px; border-radius: 20px; display: flex; align-items: center; gap: 4px; }

.g-unlock-section { padding: 4px 16px 12px; }
.g-unlock-label { font-size: 12px; font-weight: 700; color: #888; margin-bottom: 5px; }
.g-unlock-label span { color: #7C3AED; }
.g-progress { height: 6px; border-radius: 20px; background: #E8E7F2; overflow: hidden; }
.g-progress-fill { height: 100%; border-radius: 20px; background: linear-gradient(90deg, #7C3AED, #EC4899); transition: width 0.5s ease; }

.g-card-area { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; perspective: 1200px; }
.g-card-wrap { width: 100%; max-width: 340px; height: 420px; position: relative; transform-style: preserve-3d; transition: transform 0.55s cubic-bezier(0.4,0,0.2,1); cursor: pointer; }
.g-card-wrap.flipped { transform: rotateY(180deg); }
.g-card-face { position: absolute; inset: 0; border-radius: 24px; backface-visibility: hidden; -webkit-backface-visibility: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28px 24px; }
.g-card-back { background: #fff; border: 2px solid #E8E7F2; box-shadow: 0 8px 32px rgba(0,0,0,0.07); }
.g-card-back-inner { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.g-card-deck-icon { font-size: 56px; }
.g-card-back-title { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; background: linear-gradient(110deg,#7C3AED,#EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.g-card-back-hint { font-size: 13px; color: #BBB; font-weight: 700; }
.g-card-front { transform: rotateY(180deg); }
.g-card-cat-emoji { font-size: 52px; margin-bottom: 14px; }
.g-card-cat-label { font-size: 12px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 20px; opacity: 0.7; }
.g-card-prompt { font-size: 19px; font-weight: 700; text-align: center; line-height: 1.45; }
.g-card-set-name { font-size: 11px; font-weight: 700; opacity: 0.5; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px; }

.g-game-bottom { padding: 0 16px 20px; }
.g-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.g-stat { background: #fff; border: 1.5px solid #EBEBF5; border-radius: 12px; padding: 10px 8px; text-align: center; }
.g-stat-num { font-size: 22px; font-weight: 900; color: #7C3AED; }
.g-stat-label { font-size: 10px; font-weight: 800; color: #BBB; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px; }
.g-draw-btn { width: 100%; padding: 18px; border-radius: 16px; border: none; background: linear-gradient(120deg, #7C3AED, #EC4899); color: #fff; font-family: 'Nunito', sans-serif; font-size: 18px; font-weight: 900; cursor: pointer; transition: all 0.2s; box-shadow: 0 5px 20px rgba(124,58,237,0.3); }
.g-draw-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(124,58,237,0.45); }
.g-draw-btn:active { transform: translateY(0); }
.g-draw-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

.g-shuffle-btn {
  width: 100%; padding: 13px; border-radius: 14px; margin-top: 10px;
  border: 1.5px solid #D4C9FF; background: #F5F3FF;
  color: #7C3AED; font-family: 'Nunito', sans-serif; font-size: 15px; font-weight: 800;
  cursor: pointer; transition: all 0.2s;
}
.g-shuffle-btn:hover { border-color: #7C3AED; background: #EDE9FE; transform: translateY(-1px); }
.g-shuffle-btn:active { transform: translateY(0); }

.g-toast { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%) translateY(12px); background: #fff; border: 2px solid #7C3AED; color: #7C3AED; padding: 10px 20px; border-radius: 40px; font-size: 13px; font-weight: 800; opacity: 0; transition: all 0.3s; pointer-events: none; white-space: nowrap; z-index: 100; box-shadow: 0 4px 16px rgba(124,58,237,0.18); }
.g-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

/* Export modal */
.g-modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 200; display: flex; align-items: flex-end; justify-content: center;
  padding: 0;
}
.g-modal {
  background: #fff; border-radius: 24px 24px 0 0;
  width: 100%; max-width: 480px; padding: 24px 20px 32px;
  display: flex; flex-direction: column; gap: 14px;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.15);
}
.g-modal-title { font-size: 17px; font-weight: 900; }
.g-modal-sub { font-size: 13px; color: #888; font-weight: 600; margin-top: -8px; }
.g-modal-json {
  width: 100%; height: 200px; padding: 12px;
  border-radius: 10px; border: 1.5px solid #E8E7F2;
  background: #FAFAFA; font-family: monospace; font-size: 11px;
  color: #444; resize: none; outline: none; line-height: 1.5;
}
.g-modal-actions { display: flex; gap: 8px; }
.g-modal-copy {
  flex: 1; padding: 13px; border-radius: 12px; border: none;
  background: linear-gradient(120deg, #7C3AED, #EC4899);
  color: #fff; font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 800;
  cursor: pointer; transition: opacity 0.15s;
}
.g-modal-copy:hover { opacity: 0.9; }
.g-modal-close {
  padding: 13px 18px; border-radius: 12px; border: 1.5px solid #E8E7F2;
  background: transparent; color: #888; font-family: 'Nunito', sans-serif;
  font-size: 14px; font-weight: 700; cursor: pointer;
}
.g-modal-close:hover { border-color: #CCC; color: #555; }
`;

export default function App() {
  const [view, setView] = useState("setup");
  const [cardSets, setCardSets] = useState(() => {
    try { const s = localStorage.getItem("pg-sets-v3"); return s ? JSON.parse(s) : createDefaultSets(); }
    catch { return createDefaultSets(); }
  });
  const [openSet, setOpenSet] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [toast, setToast] = useState({ msg: "", show: false });
  const [exportModal, setExportModal] = useState(null);
  const [packSource, setPackSource] = useState(() => {
    try { return localStorage.getItem("pg-pack-source-v1") || "Starter deck"; }
    catch { return "Starter deck"; }
  });
  const toastRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem("pg-sets-v3", JSON.stringify(cardSets)); } catch {}
  }, [cardSets]);

  useEffect(() => {
    try { localStorage.setItem("pg-pack-source-v1", packSource); } catch {}
  }, [packSource]);

  const showToast = (msg) => {
    setToast({ msg, show: true });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2600);
  };

  const importRef = useRef(null);

  const exportConfig = () => {
    const config = {
      version: 1,
      name: packSource || "Dealbreaker Pack",
      exportedAt: new Date().toISOString(),
      sets: cardSets,
    };
    const json = JSON.stringify(config, null, 2);
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dealbreaker-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("✅ Pack downloaded!");
    } catch {
      // Sandbox blocked the download — show copy modal instead
      setExportModal(json);
    }
  };

  const importConfig = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        // Accept either a full config object or a bare array of sets
        const sets = Array.isArray(parsed) ? parsed : parsed.sets;
        if (!Array.isArray(sets)) throw new Error("Invalid format");
        const imported = normalizeSets(sets);
        const name = (!Array.isArray(parsed) && parsed.name) ? parsed.name : "Imported pack";
        setCardSets(imported);
        setPackSource(name);
        setOpenSet(null);
        showToast(`✅ Loaded ${imported.length} set${imported.length !== 1 ? "s" : ""}!`);
      } catch {
        showToast("❌ Couldn't read that file — is it a Dealbreaker JSON?");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const loadDefaultSet = () => {
    if (!DEFAULT_PACK) {
      showToast("⚠️ No default set configured yet");
      return;
    }
    setCardSets(normalizeSets(DEFAULT_PACK.sets));
    setPackSource(DEFAULT_PACK.name);
    setOpenSet(null);
    showToast(`✅ Loaded default set: ${DEFAULT_PACK.name}`);
  };

  const upd = (id, patch) => setCardSets(s => s.map(x => x.id === id ? { ...x, ...patch } : x));

  const addCard = (sid) => setCardSets(s => s.map(x =>
    x.id === sid ? { ...x, cards: [...x.cards, makeCard("Truth")] } : x
  ));
  const updCard = (sid, cid, patch) => setCardSets(s => s.map(x =>
    x.id === sid ? { ...x, cards: x.cards.map(c => c.id === cid ? { ...c, ...patch } : c) } : x
  ));
  const delCard = (sid, cid) => setCardSets(s => s.map(x =>
    x.id === sid ? { ...x, cards: x.cards.filter(c => c.id !== cid) } : x
  ));
  const delSet = (id) => { setCardSets(s => s.filter(x => x.id !== id)); if (openSet === id) setOpenSet(null); };
  const addSet = () => {
    const ns = { id: genId(), name: "New Set", unlockAt: 0, enabled: true, cards: [makeCard("Truth")] };
    setCardSets(s => [...s, ns]);
    setOpenSet(ns.id);
  };

  const startGame = () => {
    const enabled = cardSets.filter(s => s.enabled && s.cards.some(c => c.text.trim()));
    if (!enabled.length) return;
    const startPool = enabled.filter(s => s.unlockAt === 0)
      .flatMap(s => s.cards.filter(c => c.text.trim()).map(c => ({ ...c, sid: s.id, sName: s.name })));
    setGameState({ pool: startPool, used: [], pullCount: 0, current: null, unlocked: enabled.filter(s => s.unlockAt === 0).map(s => s.id) });
    setFlipped(false);
    setView("game");
  };

  const draw = () => {
    if (!gameState || !gameState.pool.length) return;
    setFlipped(false);
    setTimeout(() => {
      const idx = Math.floor(Math.random() * gameState.pool.length);
      const card = gameState.pool[idx];
      const newPool = gameState.pool.filter((_, i) => i !== idx);
      const newCount = gameState.pullCount + 1;
      const newlyUnlocked = cardSets.filter(s => s.enabled && s.unlockAt > 0 && s.unlockAt <= newCount && !gameState.unlocked.includes(s.id));
      let finalPool = newPool;
      let newUnlocked = [...gameState.unlocked];
      newlyUnlocked.forEach(s => {
        s.cards.filter(c => c.text.trim()).forEach(c => finalPool.push({ ...c, sid: s.id, sName: s.name }));
        newUnlocked.push(s.id);
        showToast(`🔓 "${s.name}" added to the pool!`);
      });
      setGameState(g => ({ ...g, pool: finalPool, used: [...g.used, card], pullCount: newCount, current: card, unlocked: newUnlocked }));
      setTimeout(() => setFlipped(true), 80);
    }, 260);
  };

  const nextUnlock = () => {
    if (!gameState) return null;
    const pending = cardSets.filter(s => s.enabled && s.unlockAt > 0 && !gameState.unlocked.includes(s.id));
    if (!pending.length) return null;
    return pending.reduce((m, s) => s.unlockAt < m.unlockAt ? s : m);
  };

  const shuffleDeck = () => {
    if (!gameState) return;
    const allCards = [...gameState.pool, ...gameState.used];
    // Fisher-Yates shuffle
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }
    setGameState(g => ({ ...g, pool: allCards, used: [], current: null }));
    setFlipped(false);
    showToast(`🔀 ${allCards.length} cards shuffled back in!`);
  };

  // ── GAME VIEW ──────────────────────────────────────────────────────────────
  if (view === "game" && gameState) {
    const nu = nextUnlock();
    const progress = nu ? Math.min(100, (gameState.pullCount / nu.unlockAt) * 100) : 100;
    const activeSets = cardSets.filter(s => gameState.unlocked.includes(s.id));
    const meta = gameState.current ? CATEGORY_META[gameState.current.category] || CATEGORY_META.Truth : null;

    return (
      <div className="g-app">
        <style>{CSS}</style>
        <div className="g-game">
          <div className="g-game-bar">
            <button className="g-back" onClick={() => setView("setup")}>← Setup</button>
            <div className="g-pull-badge">🃏 {gameState.pullCount} pulls</div>
          </div>

          <div className="g-active-sets">
            {activeSets.map(s => (
              <span key={s.id} className="g-set-pill" style={{ background: "#F5F3FF", color: "#7C3AED" }}>
                📦 {s.name}
              </span>
            ))}
            {cardSets.filter(s => s.enabled && !gameState.unlocked.includes(s.id) && s.unlockAt > 0).map(s => (
              <span key={s.id} className="g-set-pill" style={{ background: "#F5F5F5", color: "#AAA" }}>
                🔒 {s.name} (at {s.unlockAt})
              </span>
            ))}
          </div>

          {nu && (
            <div className="g-unlock-section">
              <div className="g-unlock-label">
                <span>{nu.unlockAt - gameState.pullCount} more pulls</span> to unlock "{nu.name}"
              </div>
              <div className="g-progress"><div className="g-progress-fill" style={{ width: `${progress}%` }} /></div>
            </div>
          )}

          <div className="g-card-area">
            <div className={`g-card-wrap ${flipped ? "flipped" : ""}`} onClick={() => { if (gameState.pool.length) draw(); }}>
              <div className="g-card-face g-card-back">
                <div className="g-card-back-inner">
                  <div className="g-card-deck-icon">🎴</div>
                  <div className="g-card-back-title">Dealbreaker</div>
                  <div className="g-card-back-hint">{gameState.pool.length ? (gameState.current ? "Tap for next card" : "Tap to draw") : "Deck is empty"}</div>
                </div>
              </div>
              {meta && gameState.current && (
                <div className="g-card-face g-card-front" style={{ background: meta.light }}>
                  <div className="g-card-cat-emoji">{meta.emoji}</div>
                  <div className="g-card-cat-label" style={{ color: meta.dark }}>{gameState.current.category}</div>
                  <div className="g-card-prompt" style={{ color: meta.dark }}>{gameState.current.text}</div>
                </div>
              )}
            </div>
          </div>

          <div className="g-game-bottom">
            <div className="g-stats">
              <div className="g-stat"><div className="g-stat-num">{gameState.pool.length}</div><div className="g-stat-label">Remaining</div></div>
              <div className="g-stat"><div className="g-stat-num">{gameState.used.length}</div><div className="g-stat-label">Played</div></div>
              <div className="g-stat"><div className="g-stat-num">{activeSets.length}</div><div className="g-stat-label">Active sets</div></div>
            </div>
            <button className="g-draw-btn" onClick={draw} disabled={!gameState.pool.length}>
              {gameState.pool.length === 0 ? "Deck is empty!" : "Draw a card →"}
            </button>
            {gameState.used.length > 0 && (
              <button className="g-shuffle-btn" onClick={shuffleDeck}>
                🔀 Shuffle played cards back in
              </button>
            )}
          </div>
        </div>
        <div className={`g-toast ${toast.show ? "show" : ""}`}>{toast.msg}</div>
      </div>
    );
  }

  // ── SETUP VIEW ─────────────────────────────────────────────────────────────
  const enabled = cardSets.filter(s => s.enabled);
  const totalCards = enabled.reduce((n, s) => n + s.cards.filter(c => c.text.trim()).length, 0);

  return (
    <div className="g-app">
      <style>{CSS}</style>
      <div className="g-setup">
        <div className="g-header">
          <div className="g-title">🎴 Dealbreaker</div>
          <div className="g-header-meta">{enabled.length} sets · {totalCards} cards</div>
        </div>

        <div className="g-how">
          <div className="g-how-title">⚡ How it works</div>
          <div className="g-how-step"><span>1️⃣</span><span>Create <b>card sets</b> — groups of prompts that can unlock at different points in the game.</span></div>
          <div className="g-how-step"><span>2️⃣</span><span>Each <b>prompt has its own category</b> (Truth, Dare, Action, etc.) — mix freely within a set.</span></div>
          <div className="g-how-step"><span>3️⃣</span><span>Sets with unlock &gt; 0 <b>join mid-game</b> for escalating intensity!</span></div>
        </div>

        {/* Active set indicator */}
        <div className="g-pack-source">
          <span className="g-pack-source-dot" />
          <span className="g-pack-source-label">Active set</span>
          <span className="g-pack-source-name">{packSource}</span>
        </div>

        {/* Import / Export */}
        <div className="g-io-bar">
          <button className="g-io-btn import" onClick={() => importRef.current?.click()}>
            📂 Import pack
          </button>
          <button className="g-io-btn" onClick={exportConfig}>
            💾 Export pack
          </button>
          <input ref={importRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={importConfig} />
        </div>

        {/* Use default set */}
        <div className="g-default-bar">
          <button className="g-default-btn" onClick={loadDefaultSet} disabled={!DEFAULT_PACK}>
            ⭐ {DEFAULT_PACK ? `Use default set${DEFAULT_PACK.name ? ` (${DEFAULT_PACK.name})` : ""}` : "No default set configured"}
          </button>
        </div>

        <div className="g-section-head">
          <div className="g-section-title">Card Sets</div>
          <div className="g-section-sub">Tap a set to edit</div>
        </div>

        {cardSets.map(set => {
          const isOpen = openSet === set.id;
          const validCards = set.cards.filter(c => c.text.trim());
          const dc = dominantCat(set.cards);
          const dcMeta = CATEGORY_META[dc];
          // count by category for subtitle
          const catCounts = {};
          set.cards.forEach(c => { if (c.text.trim()) catCounts[c.category] = (catCounts[c.category] || 0) + 1; });
          const catSummary = Object.entries(catCounts).map(([k, v]) => `${CATEGORY_META[k]?.emoji || "✨"} ${v}`).join("  ");

          return (
            <div key={set.id} className={`g-set ${isOpen ? "g-set-open" : ""} ${!set.enabled ? "g-set-off" : ""}`}>
              <div className="g-set-row" onClick={() => setOpenSet(isOpen ? null : set.id)}>
                <div className="g-set-emoji" style={{ background: dcMeta?.light || "#F5F3FF" }}>{dcMeta?.emoji || "📦"}</div>
                <div className="g-set-info">
                  <div className="g-set-name">{set.name}</div>
                  <div className="g-set-sub">{validCards.length} card{validCards.length !== 1 ? "s" : ""}{catSummary ? `  ·  ${catSummary}` : ""}</div>
                </div>
                <div className="g-set-chips">
                  {set.unlockAt > 0 && <span className="g-chip g-chip-lock">🔒 after {set.unlockAt}</span>}
                  {!set.enabled && <span className="g-chip g-chip-off">Off</span>}
                </div>
                <span className={`g-chevron ${isOpen ? "open" : ""}`}>▼</span>
              </div>

              {isOpen && (
                <div className="g-set-body">

                  <div className="g-field">
                    <label className="g-label">Set name</label>
                    <input className="g-input" value={set.name} onChange={e => upd(set.id, { name: e.target.value })} placeholder="e.g. Getting Spicy" />
                  </div>

                  <div className="g-field">
                    <label className="g-label">When does this set enter the game?</label>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div className="g-stepper" style={{ flex: 1 }}>
                        <button className="g-step-btn" onClick={() => upd(set.id, { unlockAt: Math.max(0, set.unlockAt - 1) })}>−</button>
                        <div className="g-step-val">{set.unlockAt}</div>
                        <button className="g-step-btn" onClick={() => upd(set.id, { unlockAt: set.unlockAt + 1 })}>+</button>
                      </div>
                      <div className={`g-step-note ${set.unlockAt === 0 ? "active" : ""}`} style={{ flex: 1 }}>
                        {set.unlockAt === 0 ? "✅ In deck from start" : `🔒 Unlocks after ${set.unlockAt} pull${set.unlockAt !== 1 ? "s" : ""}`}
                      </div>
                    </div>
                  </div>

                  <div className="g-field">
                    <label className="g-label">Prompts <span className="g-label-hint">— pick a category per prompt</span></label>
                    <div className="g-prompts">
                      {set.cards.map((card) => {
                        const cm = CATEGORY_META[card.category] || CATEGORY_META.Truth;
                        return (
                          <div key={card.id} className="g-prompt-card">
                            {/* Category tabs row */}
                            <div className="g-prompt-top">
                              <div className="g-prompt-cats">
                                {CATEGORIES.map(cat => {
                                  const m = CATEGORY_META[cat];
                                  const active = card.category === cat;
                                  return (
                                    <button
                                      key={cat}
                                      className={`g-pcat-btn ${active ? "active" : ""}`}
                                      style={active ? { "--pcat-light": m.light, "--pcat-dark": m.dark } : {}}
                                      onClick={() => updCard(set.id, card.id, { category: cat })}
                                    >
                                      <span className="g-pcat-emoji">{m.emoji}</span>
                                      {cat}
                                    </button>
                                  );
                                })}
                              </div>
                              <button className="g-prompt-del-btn" onClick={() => delCard(set.id, card.id)}>×</button>
                            </div>
                            {/* Text area */}
                            <div className="g-prompt-body" style={{ borderLeft: `3px solid ${cm.dark}` }}>
                              <textarea
                                className="g-prompt-textarea"
                                rows={1}
                                value={card.text}
                                placeholder={`${card.category} prompt...`}
                                onChange={e => updCard(set.id, card.id, { text: e.target.value })}
                                onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button className="g-add-prompt" onClick={() => addCard(set.id)} style={{ marginTop: 8 }}>
                      + Add prompt
                    </button>
                  </div>

                  <div className="g-set-footer">
                    <div className="g-toggle" onClick={() => upd(set.id, { enabled: !set.enabled })}>
                      <div className={`g-toggle-track ${set.enabled ? "on" : ""}`}><div className="g-toggle-thumb" /></div>
                      {set.enabled ? "Included in game" : "Excluded"}
                    </div>
                    <button className="g-del-btn" onClick={() => delSet(set.id)}>Delete set</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button className="g-add-set" onClick={addSet}>+ Add new card set</button>
      </div>

      <button className="g-play" onClick={startGame} disabled={totalCards === 0}>
        {totalCards === 0 ? "Add cards first" : `Play with ${totalCards} cards →`}
      </button>

      {exportModal && (
        <div className="g-modal-backdrop" onClick={() => setExportModal(null)}>
          <div className="g-modal" onClick={e => e.stopPropagation()}>
            <div className="g-modal-title">💾 Export your pack</div>
            <div className="g-modal-sub">Copy this JSON and save it as a <code>.json</code> file on your device.</div>
            <textarea className="g-modal-json" readOnly value={exportModal} onFocus={e => e.target.select()} />
            <div className="g-modal-actions">
              <button className="g-modal-copy" onClick={() => {
                navigator.clipboard.writeText(exportModal).then(() => {
                  showToast("✅ Copied to clipboard!");
                  setExportModal(null);
                });
              }}>Copy to clipboard</button>
              <button className="g-modal-close" onClick={() => setExportModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
