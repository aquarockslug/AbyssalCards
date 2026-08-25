import { resourceRates } from "./gains.js";
import Data, {
	activeCard,
	buyUpgrade,
	cardCost,
	cardValue,
	essenceFromCard,
	matchesSlot,
	modifyCost,
	state,
	upgradeCost,
} from "./game.js";

export const hand = document.getElementById("hand");
const energyEl = document.getElementById("energy");
const manaEl = document.getElementById("mana");
const controlEl = document.getElementById("control");
const essenceEl = document.getElementById("essence");
const energyDisplayEl = document.getElementById("energy-display");
const manaDisplayEl = document.getElementById("mana-display");
const controlDisplayEl = document.getElementById("control-display");
const essenceDisplayEl = document.getElementById("essence-display");
const manaRateEl = document.getElementById("mana-rate");
const energyRateEl = document.getElementById("energy-rate");
const controlRateEl = document.getElementById("control-rate");
const essenceRateEl = document.getElementById("essence-rate");
const cardStatsEl = document.getElementById("card-stats");

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

addEventListener("card-select", () => window.data.sfx.ui());

export const fmt = (n) => {
	if (!Number.isFinite(n)) return "∞";
	if (n < 0) return `-${fmt(-n)}`;
	if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
	if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
	if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
	if (n >= 100) return n.toFixed(0);
	return n.toFixed(2);
};

const fmtRate = (n) => {
	if (!Number.isFinite(n)) return "∞";
	if (Math.abs(n) < 0.05) return "0";
	if (n < 0) return `-${fmtRate(-n)}`;
	if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
	if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
	if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
	if (n >= 10) return n.toFixed(0);
	return n.toFixed(1);
};

export function updateUI() {
	manaEl.textContent = fmt(state.mana);
	energyEl.textContent = fmt(state.energy);
	controlEl.textContent = fmt(state.control);
	essenceEl.textContent = fmt(state.essence);

	const rates = resourceRates();
	manaRateEl.textContent = `${fmtRate(rates.mana)}/s`;
	energyRateEl.textContent = `${fmtRate(rates.energy)}/s`;
	controlRateEl.textContent = `${fmtRate(rates.control)}/s`;
	essenceRateEl.textContent = `${fmtRate(rates.essence)}/s`;
	cardStatsEl.textContent = state.cards.length;

	// hide resouces which have never been gained before
	const showEnergy = state.stats.totalEnergy <= 0 ? "none" : "flex";
	energyDisplayEl.style.display = showEnergy;
	energyRateEl.parentElement.style.display = showEnergy;
	const showControl = state.stats.totalControl <= 0 ? "none" : "flex";
	controlDisplayEl.style.display = showControl;
	controlRateEl.parentElement.style.display = showControl;
	const showEssence = state.stats.totalEssence <= 0 ? "none" : "flex";
	essenceDisplayEl.style.display = showEssence;
	essenceRateEl.parentElement.style.display = showEssence;

	const cost = cardCost();
	const buyBtn = document.getElementById("buy-card");
	buyBtn.textContent = `Draw Ace (${fmt(cost)} mana)`;
	buyBtn.disabled = state.mana < cost;

	// hide card modification spells when no card is selected,
	// but keep the combine slots visible while they hold cards
	const card = activeCard();
	const combining = Boolean(combineSlots[0] || combineSlots[1]);
	document
		.querySelectorAll(".modify-cost, .modify-btn, #destroy-card")
		.forEach((el) => {
			el.disabled = !card;
			const isCombineUI =
				el.classList.contains("combine-btn") ||
				Boolean(el.closest(".combine-label"));
			el.hidden = !card && !(combining && isCombineUI);
		});

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

	for (const [id, info] of worldNodes) {
		info.craftBtn.disabled = !canCraft(id);
		for (const btn of info.slotBtns)
			btn.disabled = Boolean(rituals[id]?.[Number(btn.dataset.slot)]?.filled);
	}
}

export function buildUpgradeUI() {
	const container = document.getElementById("upgrades");
	for (const [id, def] of Object.entries(Data.upgrades)) {
		const btn = document.createElement("button");
		btn.className = "btn upgrade-btn";
		btn.dataset.id = id;
		btn.innerHTML =
			`<span class="upgrade-head">` +
			`<span class="upgrade-name">${def.name}</span>` +
			`<span class="upgrade-meta">` +
			`<span class="upgrade-level">Lv 0</span>` +
			`<span class="upgrade-cost"></span>` +
			`</span></span>` +
			`<span class="upgrade-desc">${def.description}</span>`;
		btn.addEventListener("click", () => {
			if (buyUpgrade(id)) updateUI();
		});
		container.appendChild(btn);
	}
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function spendForModification() {
	const cost = modifyCost();
	if (state.control < cost) return false;
	state.control -= cost;
	state.stats.totalModifications++;
	return true;
}

export function addCard(rank, suite, location, track = true) {
	activeCard()?._deselect();
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

export function buyCard(rank, suite) {
	if (state.mana < cardCost()) return;
	state.mana -= cardCost();
	addCard(rank, suite, hand);
	window.data.sfx.draw();
	updateUI();
}

export function removeSelectedCard() {
	const card = activeCard();
	if (!card) return;
	const gain = essenceFromCard(card);
	state.essence += gain;
	state.stats.totalEssence += gain;
	state.stats.totalCardsDestroyed++;
	removeCardFromState(card);
	window.data.sfx.discard();
	layoutHand();
	updateUI();
}

function removeCardFromState(card) {
	const idx = [...hand.querySelectorAll("game-card")].indexOf(card);
	card.remove();
	if (idx >= 0 && state.cards[idx]) state.cards.splice(idx, 1);
}

function syncCardState(card) {
	const idx = [...hand.querySelectorAll("game-card")].indexOf(card);
	if (idx >= 0 && state.cards[idx]) {
		state.cards[idx].rank = card.getAttribute("rank");
		state.cards[idx].suite = card.getAttribute("suite");
	}
}

export function modifySelectedCard(attrs) {
	const card = activeCard();
	if (!card) return;
	if (!spendForModification()) return;
	for (const [k, v] of Object.entries(attrs)) card.setAttribute(k, v);
	syncCardState(card);
	updateUI();
}

export function shiftRank(delta) {
	const card = activeCard();
	if (!card) return;
	if (!spendForModification()) return;
	const ranks = Data.card.rank;
	const i = ranks.indexOf(card.getAttribute("rank"));
	card.setAttribute("rank", ranks[(i + delta + ranks.length) % ranks.length]);
	syncCardState(card);
	updateUI();
}

const combineSlots = [null, null];

// shrink + glide a selected card into a slot outline, leaving a static
// mini face behind; the card is removed from hand and state on landing
function flyCardToSlot(card, btn) {
	const first = card.getBoundingClientRect();

	// deselect manually; _deselect() resets the transform on the next
	// frame, which would fight the fly-to-slot transform below
	card._selected = false;
	card.removeAttribute("active");
	const tilt = card.shadowRoot?.querySelector("hover-tilt");
	if (tilt && card._prevScaleFactor != null)
		tilt.setAttribute("scale-factor", card._prevScaleFactor);

	// leave a static mini face behind in the outline
	const face = card.querySelector("svg")?.cloneNode(true);
	if (face) face.style.boxShadow = "";
	const slotFace = document.createElement("span");
	slotFace.className = "slot-face";
	if (face) slotFace.appendChild(face);
	btn.replaceChildren(slotFace);

	const last = slotFace.getBoundingClientRect();
	card.style.pointerEvents = "none";
	card.style.zIndex = "100";
	card.style.transformOrigin = "top left";
	card.style.transform =
		`translate(${first.left - last.left}px, ${first.top - last.top}px) ` +
		`scale(${first.width / last.width})`;

	// card transition runs 0.4s; clean up once it has landed
	setTimeout(() => {
		removeCardFromState(card);
		layoutHand();
		updateUI();
	}, 450);
}

export function placeInCombineSlot(i) {
	const card = activeCard();
	if (!card || combineSlots[i]) return;
	if (!spendForModification()) return;

	flyCardToSlot(card, document.querySelectorAll(".combine-btn")[i]);
	combineSlots[i] = {
		rank: card.getAttribute("rank"),
		suite: card.getAttribute("suite"),
	};
	window.data.sfx.magic();

	if (combineSlots[0] && combineSlots[1]) setTimeout(performCombine, 600);
}

function performCombine() {
	const [a, b] = combineSlots;
	combineSlots[0] = combineSlots[1] = null;
	document.querySelectorAll(".combine-btn").forEach((btn) => {
		btn.replaceChildren();
	});

	// ranks sum, capped at 10; result keeps the first card's suite
	const total = Math.min(cardValue(a.rank) + cardValue(b.rank), 10);
	addCard(total === 1 ? "ace" : String(total), a.suite, hand);
	window.data.sfx.draw();
	updateUI();
}

// ---------- world rituals ----------

const worldNodes = new Map();
let activeNodeId = null;
const rituals = {};

function initRitual(id) {
	rituals[id] ??= Data.world[id].recipe.map((spec) => ({
		spec,
		card: null,
		filled: false,
	}));
	return rituals[id];
}

function canCraft(id) {
	if (state.world[id]) return false;
	const node = Data.world[id];
	if (node.requires.some((p) => !state.world[p])) return false;
	for (const [res, amount] of Object.entries(node.cost))
		if ((state[res] ?? 0) < amount) return false;
	const ritual = rituals[id];
	if (node.recipe.length && !ritual?.every((e) => e.filled)) return false;
	return true;
}

export function buildWorldUI() {
	const pane = document.getElementById("world");
	for (const [id, node] of Object.entries(Data.world)) {
		const el = document.createElement("div");
		el.className = "world-node";
		el.dataset.id = id;
		el.innerHTML =
			`<div class="node-head">` +
			`<span class="node-name">${node.name}</span>` +
			`<span class="node-status"></span>` +
			`</div>` +
			`<div class="node-desc">${node.description}</div>` +
			`<div class="node-cost"></div>` +
			`<div class="node-reqs"></div>` +
			`<div class="node-offering">` +
			`<span class="btn-group-label">Offering</span>` +
			`<div class="btn-group ritual-row">` +
			node.recipe
				.map(
					(_, i) =>
						`<button type="button" class="btn combine-btn ritual-slot" data-slot="${i}"></button>`,
				)
				.join("") +
			`<button type="button" class="btn craft-btn">${node.verb}</button>` +
			`</div></div>`;

		el.querySelector(".node-head").addEventListener("click", () =>
			toggleWorldNode(id),
		);
		el.querySelector(".craft-btn").addEventListener("click", () =>
			performRitual(id),
		);

		const info = {
			el,
			statusEl: el.querySelector(".node-status"),
			costEl: el.querySelector(".node-cost"),
			reqEl: el.querySelector(".node-reqs"),
			offeringEl: el.querySelector(".node-offering"),
			craftBtn: el.querySelector(".craft-btn"),
			slotBtns: [...el.querySelectorAll(".ritual-slot")],
		};
		worldNodes.set(id, info);
		for (const [i, btn] of info.slotBtns.entries())
			btn.addEventListener("click", () => placeInRitualSlot(id, i));

		pane.appendChild(el);
	}
	refreshWorld();
}

export function toggleWorldNode(id) {
	if (state.world[id]) return;
	const node = Data.world[id];
	if (node.requires.some((p) => !state.world[p])) return;
	activeNodeId = activeNodeId === id ? null : id;
	if (activeNodeId) initRitual(activeNodeId);
	window.data.sfx.ui();
	refreshWorld();
	updateUI();
}

export function refreshWorld() {
	for (const [id, info] of worldNodes) {
		const node = Data.world[id];
		const complete = Boolean(state.world[id]);
		const unlocked = node.requires.every((p) => state.world[p]);
		const discovered = unlocked || node.requires.some((p) => state.world[p]);
		info.el.hidden = !discovered;
		info.el.classList.toggle("completed", complete);
		info.el.classList.toggle("locked", !unlocked && discovered);
		info.el.classList.toggle("selected", activeNodeId === id);
		info.statusEl.textContent = complete ? "\u2726 woven into being" : "";
		info.reqEl.textContent =
			unlocked || complete
				? ""
				: `Requires ${node.requires
						.map((p) => Data.world[p].name)
						.join(" + ")}`;
		info.costEl.textContent = Object.entries(node.cost)
			.map(
				([res, amount]) =>
					`${fmt(amount)} ${res[0].toUpperCase()}${res.slice(1)}`,
			)
			.join(" · ");
		info.offeringEl.hidden =
			!node.recipe.length || complete || activeNodeId !== id;
		info.craftBtn.hidden = complete || activeNodeId !== id;
	}
}

export function placeInRitualSlot(nodeId, slotIndex) {
	if (state.world[nodeId]) return;
	const ritual = initRitual(nodeId);
	const entry = ritual[slotIndex];
	if (!entry || entry.filled) return;
	const card = activeCard();
	if (!card) return;
	const placed = ritual.filter((e) => e.filled).map((e) => e.card);
	if (!matchesSlot(card, entry.spec, placed)) {
		window.data.sfx.discard();
		return;
	}
	entry.card = card;
	entry.filled = true;
	const btn = worldNodes.get(nodeId).slotBtns[slotIndex];
	flyCardToSlot(card, btn);
	window.data.sfx.magic();
	updateUI();
}

export function performRitual(nodeId) {
	if (state.world[nodeId] || !canCraft(nodeId)) return;
	const node = Data.world[nodeId];
	for (const [res, amount] of Object.entries(node.cost)) state[res] -= amount;
	state.world[nodeId] = true;
	delete rituals[nodeId];
	if (activeNodeId === nodeId) activeNodeId = null;
	window.data.sfx.magic();
	refreshWorld();
	updateUI();
}

window.addRandomCard = () => addCard(null, null, hand);
window.modifySelectedCard = modifySelectedCard;
window.shiftRank = shiftRank;
window.buyCard = buyCard;
window.removeSelectedCard = removeSelectedCard;
window.placeInCombineSlot = placeInCombineSlot;
