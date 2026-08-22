import { zzfx } from "./lib/ZzFX.js";

const Data = {
	card: {
		background: "#3bd4f5",
		effects: [
			// https://hover-tilt.simey.me/options/props/
			["shadow", "true"],
			["glare-intensity", "0.5"],
			["glare-hue", "200"],
			["scale-factor", "1"],
			["tilt-factor", "1"],
			["tilt-factor-y", "1"],
		],
		rank: ["ace", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
		suite: ["spades", "clubs", "hearts", "diamonds"],
	},
	upgrades: {
		manaFlow: {
			name: "Mana Flow",
			description: "+25% mana generation per level",
			resource: "energy",
			baseCost: 5,
			costGrowth: 1.6,
		},
		transmute: {
			name: "Transmutation",
			description: "+50% transmute power per level",
			resource: "energy",
			baseCost: 15,
			costGrowth: 2.2,
		},
		handGrowth: {
			name: "Magnetic Hand",
			description: "-10% card cost per level",
			resource: "control",
			baseCost: 30,
			costGrowth: 2,
		},
	},
	sparticle: {
		abyss: {
			count: 799,
			parallax: 17.4,
			direction: 0,
			xVariance: 2.6,
			yVariance: 7.8,
			alphaSpeed: 21,
			alphaVariance: 0,
			minAlpha: -2,
			maxAlpha: 2,
			maxSize: 4,
			style: "both",
			drift: 5.9,
			spawnArea: 1,
			color: ["#ffffff", "#68e8f6", "#3bd4f5", "#017a98", "#017a98", "#017a98"],
		},
		stars: {
			count: 1000,
			speed: 0,
			direction: 0,
			xVariance: 0.2,
			yVariance: 0.2,
			rotate: false,
			rotation: 0,
			alphaSpeed: 4.2,
			alphaVariance: 6,
			minAlpha: -0.4,
			maxAlpha: 1.4,
			maxSize: 7,
			drift: 0,
			twinkle: true,
			spawnArea: 1,
			color: ["#ffccfe", "#b5eefb", "#95c5f4", "#c2b0e3", "#dff1ff", "#fff"],
			shape: ["star", "diamond"],
		},
		fire: {
			count: 125,
			speed: 50,
			parallax: 42,
			direction: 0,
			xVariance: 8,
			rotation: 3,
			alphaSpeed: 4,
			alphaVariance: 9,
			minSize: 4,
			maxSize: 16,
			style: "both",
			drift: 0,
			glow: 20,
			twinkle: true,
			spawnFromPoint: true,
			spawnArea: 10,
			staggerSpawn: 12,
			color: ["#ffffff", "#ffb366", "#f3ca7c", "#875005"],
			shape: ["star", "circle"],
		},
	},
	// biome-ignore format: sfx
	sfx: {
		ui: () => zzfx(...[,,453,.01,,.02,2,2.6,76,34,,,,.5,,,.49,.92]),
		magic: () => zzfx(...[,0,261.6256,.2,.07,.45,1,,,,,,,.1,,.1,,.44,.13]),
		draw: () => zzfx(...[0.5,,363,,.09,.05,1,3.4,,,495,.1,.05,,,,,.74,.02]),
		discard: () => zzfx(...[0.8,,38,.04,.12,.25,4,.6,,1,,,,.4,,.9,,.38,.06])
	},
};

export default Data;
window.data = Data;

export function defaultState() {
	return {
		mana: 0,
		energy: 0,
		control: 0,
		cards: [],
		upgrades: { manaFlow: 0, transmute: 0, handGrowth: 0 },
		stats: {
			totalCardsDrawn: 0,
			totalUpgrades: 0,
			totalModifications: 0,
			totalMana: 0,
			totalEnergy: 0,
			totalControl: 0,
		},
		lastSeen: Date.now(),
	};
}

export const state = defaultState();
window.state = state;

const cardValue = (c) =>
	c.getAttribute("rank") === "ace" ? 1 : Number(c.getAttribute("rank"));

export const manaPerSec = () => 1 * (1 + 0.25 * state.upgrades.manaFlow);

export const transmutePerSec = () => 0.1 * (1 + 0.5 * state.upgrades.transmute);

const TRACKED_RESOURCES = ["mana", "energy", "control"];
const RATE_SMOOTHING = 0.15;
let lastSample = null;
const observedRates = { mana: 0, energy: 0, control: 0 };

export function trackRates(dtMs) {
	const dt = dtMs / 1000;
	const sample = Object.fromEntries(
		TRACKED_RESOURCES.map((r) => [r, state[r]]),
	);
	if (!lastSample || dt <= 0) {
		lastSample = sample;
		return;
	}
	for (const r of TRACKED_RESOURCES) {
		const instant = (sample[r] - lastSample[r]) / dt;
		observedRates[r] += (instant - observedRates[r]) * RATE_SMOOTHING;
	}
	lastSample = sample;
}

export const resourceRates = () => ({ ...observedRates });

export const cardCost = () =>
	5 * 3 ** state.cards.length * 0.9 ** state.upgrades.handGrowth;

export const upgradeCost = (id) => {
	const def = Data.upgrades[id];
	return def.baseCost * def.costGrowth ** state.upgrades[id];
};

export const modifyCost = () =>
	activeCard() ? cardValue(activeCard()) * 10 : undefined;

export function redValue() {
	return getCards(
		"game-card[suite='diamonds'], game-card[suite='hearts']",
	).reduce((acc, c) => acc + cardValue(c), 0);
}

export function blackValue() {
	return getCards(
		"game-card[suite='spades'], game-card[suite='clubs'] ",
	).reduce((acc, c) => acc + cardValue(c), 0);
}

export function buyUpgrade(id) {
	const cost = upgradeCost(id);
	if (state[Data.upgrades[id].resource] < cost) return false;
	state[Data.upgrades[id].resource] -= cost;
	state.upgrades[id]++;
	state.stats.totalUpgrades++;
	return true;
}

export const activeCard = () => document.querySelector("game-card[active]");
export const getCards = (query) => Array.from(document.querySelectorAll(query));

window.buyUpgrade = buyUpgrade;
