import Data, {
	buyUpgrade,
	cardCost,
	modifyCost,
	state,
	upgradeCost,
} from "./game.js";

export const hand = document.getElementById("hand");
const energyEl = document.getElementById("energy");
const manaEl = document.getElementById("mana");
const controlEl = document.getElementById("control");

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

	const cost = cardCost();
	const buyBtn = document.getElementById("buy-card");
	buyBtn.textContent = `Draw Ace (${fmt(cost)} mana)`;
	buyBtn.disabled = state.mana < cost;

	// hide card modification spells when no card is selected
	const activeCard = getActiveCard();
	document.querySelectorAll(".modify-cost, .modify-btn").forEach((el) => {
		el.disabled = !activeCard;
		el.hidden = !activeCard;
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
		btn.setAttribute("data-microtip-size", "large");
		btn.innerHTML =
			`<span class="upgrade-name">${def.name}</span>` +
			`<span class="upgrade-level">Lv 0</span>` +
			`<span class="upgrade-cost"></span>`;
		btn.addEventListener("click", () => {
			if (buyUpgrade(id)) updateUI();
		});
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

export function buyCard(rank, suite) {
	if (state.mana < cardCost()) return;
	state.mana -= cardCost();
	addCard(rank, suite, hand);
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

window.addRandomCard = () => addCard(null, null, hand);
window.modifySelectedCard = modifySelectedCard;
window.shiftRank = shiftRank;
window.buyCard = buyCard;
window.removeSelectedCard = removeSelectedCard;
