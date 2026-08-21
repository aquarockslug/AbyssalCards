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
			baseCost: 15,
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
	achievements: [
		{
			id: "energized",
			name: "Energized",
			description: "Gain 100 total energy",
			bonus: 0.15,
			check: (s) => s.stats.totalEnergy >= 100,
		},
		{
			id: "overcharged",
			name: "Overcharged",
			description: "Gain 1,000 total energy",
			bonus: 0.25,
			check: (s) => s.stats.totalEnergy >= 1000,
		},
		{
			id: "controlling",
			name: "Controlling",
			description: "Gain 100 total control",
			bonus: 0.15,
			check: (s) => s.stats.totalControl >= 100,
		},
		{
			id: "dominating",
			name: "Dominating",
			description: "Gain 1,000 total control",
			bonus: 0.25,
			check: (s) => s.stats.totalControl >= 1000,
		},
		{
			id: "apprentice",
			name: "Apprentice",
			description: "Buy 5 upgrades",
			bonus: 0.1,
			check: (s) => s.stats.totalUpgrades >= 5,
		},
		{
			id: "journeyman",
			name: "Journeyman",
			description: "Buy 10 upgrades",
			bonus: 0.1,
			check: (s) => s.stats.totalUpgrades >= 10,
		},
	],
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
		achievements: [],
		lastSeen: Date.now(),
	};
}

export const state = defaultState();
window.state = state;

const cardValue = (c) => (c.rank === "ace" ? 1 : Number(c.rank));
const achievementBonus = () => {
	let bonus = 1;
	for (const a of Data.achievements)
		if (state.achievements.includes(a.id)) bonus += a.bonus;
	return bonus;
};

export const manaPerSec = () =>
	1 * (1 + 0.25 * state.upgrades.manaFlow) * achievementBonus();

export const transmutePerSec = () => 0.1 * (1 + 0.5 * state.upgrades.transmute);

export const cardCost = () =>
	5 * 3 ** state.cards.length * 0.9 ** state.upgrades.handGrowth;

export const upgradeCost = (id) => {
	const def = Data.upgrades[id];
	return def.baseCost * def.costGrowth ** state.upgrades[id];
};

// TODO modify cost should depend on the selected card
export const modifyCost = () => {
	// activeCard()
	return 5;
};

export function getHandInfo() {
	return {
		suite: {
			hearts: state.cards.filter((c) => c.suite === "hearts"),
			diamonds: state.cards.filter((c) => c.suite === "diamonds"),
			spades: state.cards.filter((c) => c.suite === "spades"),
			clubs: state.cards.filter((c) => c.suite === "clubs"),
		},
	};
}

export function redValue() {
	const { hearts, diamonds } = getHandInfo().suite;
	return [...hearts, ...diamonds].reduce((acc, c) => acc + cardValue(c), 0);
}

export function blackValue() {
	const { spades, clubs } = getHandInfo().suite;
	return [...spades, ...clubs].reduce((acc, c) => acc + cardValue(c), 0);
}

export function checkAchievements() {
	for (const a of Data.achievements) {
		if (state.achievements.includes(a.id)) continue;
		if (!a.check(state)) continue;
		state.achievements.push(a.id);
	}
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

window.buyUpgrade = buyUpgrade;
