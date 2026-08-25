import { resourceRates } from "./gains.js";
import Data, {
	activeCard,
	buyUpgrade,
	cardCost,
	essenceFromCard,
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
	const idx = [...hand.querySelectorAll("game-card")].indexOf(card);
	const gain = essenceFromCard(card);
	state.essence += gain;
	state.stats.totalEssence += gain;
	state.stats.totalCardsDestroyed++;
	card.remove();
	window.data.sfx.discard();
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

export function placeInCombineSlot(i) {
	const card = activeCard();
	if (!card || combineSlots[i]) return;
	if (!spendForModification()) return;

	const btn = document.querySelectorAll(".combine-btn")[i];
	const rank = card.getAttribute("rank");
	const suite = card.getAttribute("suite");

	// measure while the card is still in its selected pose
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

	// shrink + glide the card into the button's outline
	const last = slotFace.getBoundingClientRect();
	card.style.pointerEvents = "none";
	card.style.zIndex = "100";
	card.style.transformOrigin = "top left";
	card.style.transform =
		`translate(${first.left - last.left}px, ${first.top - last.top}px) ` +
		`scale(${first.width / last.width})`;

	combineSlots[i] = { rank, suite };
	window.data.sfx.magic();

	// card transition runs 0.4s; clean up once it has landed
	setTimeout(() => {
		const idx = [...hand.querySelectorAll("game-card")].indexOf(card);
		card.remove();
		if (idx >= 0 && state.cards[idx]) state.cards.splice(idx, 1);
		layoutHand();
		updateUI();
	}, 450);

	if (combineSlots[0] && combineSlots[1]) setTimeout(performCombine, 600);
}

function performCombine() {
	const [a, b] = combineSlots;
	combineSlots[0] = combineSlots[1] = null;
	document.querySelectorAll(".combine-btn").forEach((btn) => {
		btn.replaceChildren();
	});

	// ranks sum, capped at 10; result keeps the first card's suite
	const value = (r) => (r === "ace" ? 1 : Number(r));
	const total = Math.min(value(a.rank) + value(b.rank), 10);
	addCard(total === 1 ? "ace" : String(total), a.suite, hand);
	window.data.sfx.draw();
	updateUI();
}

window.addRandomCard = () => addCard(null, null, hand);
window.modifySelectedCard = modifySelectedCard;
window.shiftRank = shiftRank;
window.buyCard = buyCard;
window.removeSelectedCard = removeSelectedCard;
window.placeInCombineSlot = placeInCombineSlot;
