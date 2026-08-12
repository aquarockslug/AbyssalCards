import Data, {
	buyUpgrade,
	cardCost,
	getBoardInfo,
	getHandInfo,
	manaPerSec,
	modifyCost,
	state,
	transmutePerSec,
	upgradeCost,
} from "./game.js";

export const hand = document.getElementById("hand");
const energyEl = document.getElementById("energy");
const manaEl = document.getElementById("mana");
const controlEl = document.getElementById("control");

const boardEl = document.getElementById("board");
let boardCanvas = null;
let boardOriginX = 0;
let boardOriginY = 0;
const BOARD_COLS = 3;
const BOARD_ROWS = 3;
const BOARD_CAPACITY = BOARD_COLS * BOARD_ROWS;
const ISO_SCALE = 135;
const ISO_COS = Math.cos(Math.PI / 6);
const ISO_SIN = Math.sin(Math.PI / 6);

const HAND_SCALE = 0.85;
const MAX_GAP = 115;
const MIN_SLIVER = 30;
const MAX_HAND_WIDTH = 1600;

export function layoutHand() {
	const cards = hand.querySelectorAll("game-card");
	const n = cards.length;
	if (n < 2) {
		hand.style.removeProperty("--card-gap");
		return;
	}
	const c = cards[0];
	const cardW = c.offsetWidth;
	const ml = parseFloat(getComputedStyle(c).marginLeft);
	const step = cardW + parseFloat(getComputedStyle(c).marginRight);
	const available = Math.min(window.innerWidth / HAND_SCALE, MAX_HAND_WIDTH);
	const defaultGap = Math.max(
		-120,
		Math.min(MAX_GAP, (window.innerWidth - 900) * 0.25),
	);
	if (ml + step * n + (n - 1) * defaultGap <= available) {
		hand.style.removeProperty("--card-gap");
		return;
	}
	const gap = Math.max(
		MIN_SLIVER - step,
		(available - ml - step * n) / (n - 1),
	);
	hand.style.setProperty("--card-gap", `${gap}px`);
}

// Card SVGs load async, so layoutHand would measure width 0 at boot.
// Recompute whenever card content is added/removed (also covers window resize).
new MutationObserver(layoutHand).observe(hand, {
	childList: true,
	subtree: true,
});

export const fmt = (n) => {
	if (!Number.isFinite(n)) return "∞";
	if (n < 0) return `-${fmt(-n)}`;
	if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
	if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
	if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
	if (n >= 100) return n.toFixed(0);
	return n.toFixed(2);
};

export function updateUI() {
	manaEl.textContent = fmt(state.mana);
	energyEl.textContent = fmt(state.energy);
	controlEl.textContent = fmt(state.control);

	const { hearts, diamonds, spades, clubs } = getHandInfo();
	const red = hearts + diamonds;
	const black = spades + clubs;

	const board = getBoardInfo();
	const redB = board.hearts + board.diamonds;
	const blackB = board.spades + board.clubs;
	const boardCount = state.board.filter(Boolean).length;
	const ep = Math.min(state.mana, transmutePerSec() * redB);
	const cp = Math.min(state.mana, transmutePerSec() * blackB);

	document.getElementById("mana-rate").textContent = `${fmt(manaPerSec())}/s`;
	document.getElementById("energy-rate").textContent = `${fmt(ep)}/s`;
	document.getElementById("control-rate").textContent = `${fmt(cp)}/s`;
	document.getElementById("card-stats").textContent =
		`${state.cards.length} hand (${red} red, ${black} black) · ` +
		`${boardCount} board (${redB} red, ${blackB} black)`;

	const cost = cardCost();
	const buyBtn = document.getElementById("buy-card");
	buyBtn.textContent = `Draw Card (${fmt(cost)} mana)`;
	buyBtn.disabled = state.mana < cost;

	const mCost = modifyCost();
	document.querySelectorAll(".modify-cost").forEach((el) => {
		el.textContent = `Cost: ${fmt(mCost)} control`;
	});
	const canModify = state.control >= mCost;
	document.querySelectorAll(".modify-btn").forEach((btn) => {
		btn.disabled = !canModify;
	});

	document.querySelectorAll(".upgrade-btn").forEach((btn) => {
		const id = btn.dataset.id;
		const def = Data.upgrades[id];
		const c = upgradeCost(id);
		btn.querySelector(".upgrade-cost").textContent =
			`${fmt(c)} ${def.resource}`;
		btn.querySelector(".upgrade-level").textContent =
			`Lv ${state.upgrades[id]}`;
		btn.disabled = state[def.resource] < c;
	});

	document.querySelectorAll(".achievement").forEach((el) => {
		el.classList.toggle("unlocked", state.achievements.includes(el.dataset.id));
	});
}

export function buildUpgradeUI() {
	const container = document.getElementById("upgrades");
	const label = document.createElement("span");
	label.className = "btn-group-label";
	label.textContent = "Upgrades";
	container.appendChild(label);
	for (const [id, def] of Object.entries(Data.upgrades)) {
		const btn = document.createElement("button");
		btn.className = "btn upgrade-btn";
		btn.dataset.id = id;
		btn.setAttribute("role", "tooltip");
		btn.setAttribute("aria-label", def.description);
		btn.setAttribute("data-microtip-position", "bottom");
		btn.innerHTML =
			`<span class="upgrade-name">${def.name}</span>` +
			`<span class="upgrade-level">Lv 0</span>` +
			`<span class="upgrade-cost"></span>`;
		btn.addEventListener("click", () => {
			if (buyUpgrade(id)) updateUI();
		});
		btn.addEventListener("mouseenter", () => showUpgradeTip(btn));
		btn.addEventListener("mouseleave", hideUpgradeTip);
		btn.addEventListener("focus", () => showUpgradeTip(btn));
		btn.addEventListener("blur", hideUpgradeTip);
		container
			.closest(".window-pane")
			?.addEventListener("scroll", hideUpgradeTip);
		container.appendChild(btn);
	}
}

export function buildAchievementUI() {
	const container = document.getElementById("achievements");
	const label = document.createElement("span");
	label.className = "btn-group-label";
	label.textContent = "Achievements";
	container.appendChild(label);
	for (const a of Data.achievements) {
		const div = document.createElement("div");
		div.className = "achievement";
		div.dataset.id = a.id;
		div.innerHTML =
			`<span class="achievement-top">` +
			`<span class="achievement-name">${a.name}</span>` +
			`<span class="achievement-bonus">+${Math.round(a.bonus * 100)}% mana</span>` +
			`</span>` +
			`<span class="achievement-desc">${a.description}</span>`;
		container.appendChild(div);
	}
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const getActiveCard = () => document.querySelector("game-card[active]");

// Upgrade tooltips would be clipped inside the scrollable panel, so render them
// as a fixed, body-level tooltip that always sits on top.
let upgradeTip = null;

function ensureUpgradeTip() {
	if (upgradeTip) return;
	upgradeTip = document.createElement("div");
	upgradeTip.className = "game-tooltip";
	document.body.appendChild(upgradeTip);
}

function showUpgradeTip(btn) {
	const text = btn.getAttribute("aria-label");
	if (!text) return;
	ensureUpgradeTip();
	upgradeTip.textContent = text;
	upgradeTip.style.display = "block";
	const r = btn.getBoundingClientRect();
	const tr = upgradeTip.getBoundingClientRect();
	const left = Math.min(
		Math.max(r.left + r.width / 2 - tr.width / 2, 8),
		window.innerWidth - tr.width - 8,
	);
	upgradeTip.style.left = `${Math.round(left)}px`;
	upgradeTip.style.top = `${Math.round(r.top - tr.height - 10)}px`;
}

function hideUpgradeTip() {
	if (!upgradeTip) return;
	upgradeTip.style.display = "none";
}

function spendForModification() {
	const cost = modifyCost();
	if (state.control < cost) return false;
	state.control -= cost;
	state.stats.totalModifications++;
	return true;
}

export function addCard(rank, suite, location, track = true) {
	getActiveCard()?._deselect();
	const card = document.createElement("game-card");
	card.setAttribute("rank", rank || pick(Data.card.rank));
	card.setAttribute("suite", suite || pick(Data.card.suite));
	location.appendChild(card);
	layoutHand();
	if (track) {
		state.cards.push({
			rank: card.getAttribute("rank"),
			suite: card.getAttribute("suite"),
		});
		state.stats.totalCardsDrawn++;
	}
	return card;
}

export function buyCard() {
	if (state.mana < cardCost()) return;
	state.mana -= cardCost();
	addCard(null, null, hand);
	updateUI();
}

export function removeSelectedCard() {
	const card = getActiveCard();
	if (!card) return;
	const idx = [...hand.querySelectorAll("game-card")].indexOf(card);
	card.remove();
	if (idx >= 0 && state.cards[idx]) state.cards.splice(idx, 1);
	layoutHand();
	updateUI();
}

function syncCardState(card) {
	const idx = [...hand.querySelectorAll("game-card")].indexOf(card);
	if (idx >= 0 && state.cards[idx]) {
		state.cards[idx].rank = card.getAttribute("rank");
		state.cards[idx].suite = card.getAttribute("suite");
	}
}

export function modifySelectedCard(attrs) {
	const card = getActiveCard();
	if (!card) return;
	if (!spendForModification()) return;
	for (const [k, v] of Object.entries(attrs)) card.setAttribute(k, v);
	syncCardState(card);
	updateUI();
}

export function shiftRank(delta) {
	const card = getActiveCard();
	if (!card) return;
	if (!spendForModification()) return;
	const ranks = Data.card.rank;
	const i = ranks.indexOf(card.getAttribute("rank"));
	card.setAttribute("rank", ranks[(i + delta + ranks.length) % ranks.length]);
	syncCardState(card);
	updateUI();
}

// ---------- board ----------

function ensureBoardArray() {
	while (state.board.length < BOARD_CAPACITY) state.board.push(null);
}

function gridToScreen(gx, gy) {
	return {
		x: boardOriginX + ISO_SCALE * ISO_COS * (gx - gy),
		y: boardOriginY - ISO_SCALE * ISO_SIN * (gx + gy),
	};
}

function cellAt(px, py) {
	const a = (px - boardOriginX) / (ISO_SCALE * ISO_COS);
	const b = (boardOriginY - py) / (ISO_SCALE * ISO_SIN);
	const gx = (a + b) / 2;
	const gy = (b - a) / 2;
	const i = Math.round(gx - 0.5);
	const j = Math.round(gy - 0.5);
	if (i < 0 || j < 0 || i >= BOARD_COLS || j >= BOARD_ROWS) return -1;
	if (Math.abs(a - (i - j)) + Math.abs(b - (i + j + 1)) > 1.001) return -1;
	return j * BOARD_COLS + i;
}

function updateBoardHint() {
	const hint = boardEl?.querySelector(".board-hint");
	if (!hint) return;
	const full = state.board.filter(Boolean).length >= BOARD_CAPACITY;
	const active = !!getActiveCard();
	if (full) hint.textContent = "Board is full — click a card to return it";
	else if (active)
		hint.textContent = "Click an empty tile to play the selected card";
	else hint.textContent = "Select a card, then click a tile to play it";
	hint.classList.toggle(
		"hidden",
		state.board.filter(Boolean).length > 0 && !full && !active,
	);
}

export function renderBoard() {
	if (!boardEl) return;
	ensureBoardArray();

	if (!boardCanvas) {
		boardCanvas = document.createElement("canvas");
		boardCanvas.addEventListener("click", (e) => {
			const rect = boardCanvas.getBoundingClientRect();
			const idx = cellAt(e.clientX - rect.left, e.clientY - rect.top);
			if (idx < 0) return;
			if (state.board[idx]) returnBoardCard(idx);
			else playSelectedCardTo(idx);
		});
		boardEl.appendChild(boardCanvas);
	}

	const w = boardEl.clientWidth || 560;
	const h = boardEl.clientHeight || 500;
	boardCanvas.width = w;
	boardCanvas.height = h;

	const iso = new Isomer(boardCanvas);
	const { Point, Shape, Color } = Isomer;
	const footprintH = (BOARD_COLS + BOARD_ROWS) * ISO_SCALE * ISO_SIN;
	iso.scale = ISO_SCALE;
	boardOriginX = w / 2;
	boardOriginY = h / 2 + footprintH / 2;
	iso.originX = boardOriginX;
	iso.originY = boardOriginY;

	const tileColor = new Color(18, 100, 128);
	const emptyColor = new Color(8, 58, 80);
	for (let j = 0; j < BOARD_ROWS; j++) {
		for (let i = 0; i < BOARD_COLS; i++) {
			const filled = !!state.board[j * BOARD_COLS + i];
			iso.add(
				Shape.Prism(Point(i, j, 0), 1, 1, 0.06),
				filled ? tileColor : emptyColor,
			);
		}
	}

	boardEl.querySelectorAll(".board-slot").forEach((el) => {
		el.remove();
	});
	state.board.forEach((cardData, idx) => {
		if (cardData) {
			const c = gridToScreen(
				(idx % BOARD_COLS) + 0.5,
				Math.floor(idx / BOARD_COLS) + 0.5,
			);
			const wrap = document.createElement("div");
			wrap.className = "board-slot";
			wrap.dataset.idx = idx;
			wrap.style.left = `${c.x}px`;
			wrap.style.top = `${c.y}px`;
			const card = document.createElement("game-card");
			card.setAttribute("rank", cardData.rank);
			card.setAttribute("suite", cardData.suite);
			wrap.appendChild(card);
			boardEl.appendChild(wrap);
		}
	});

	updateBoardHint();
}

function playSelectedCardTo(idx) {
	ensureBoardArray();
	if (state.board[idx]) return;
	const card = getActiveCard();
	if (!card) return;
	const handIdx = [...hand.querySelectorAll("game-card")].indexOf(card);
	if (handIdx < 0) return;
	const data = state.cards[handIdx];
	card._deselect();
	card.remove();
	state.cards.splice(handIdx, 1);
	state.board[idx] = data;
	layoutHand();
	renderBoard();
	updateUI();
}

function returnBoardCard(idx) {
	ensureBoardArray();
	const data = state.board[idx];
	if (!data) return;
	state.board[idx] = null;
	state.cards.push(data);
	addCard(data.rank, data.suite, hand, false);
	renderBoard();
	updateUI();
}

export function playSelectedCard() {
	const card = getActiveCard();
	if (!card) return;
	ensureBoardArray();
	const idx = state.board.findIndex((c) => c == null);
	if (idx < 0) return;
	playSelectedCardTo(idx);
}

window.addCard = (rank, suite) => addCard(rank, suite, hand);
window.addRandomCard = () => addCard(null, null, hand);
window.modifySelectedCard = modifySelectedCard;
window.shiftRank = shiftRank;
window.buyCard = buyCard;
window.removeSelectedCard = removeSelectedCard;
window.playSelectedCard = playSelectedCard;
