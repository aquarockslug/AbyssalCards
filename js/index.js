import Data, {
	checkAchievements,
	getHandInfo,
	manaPerSec,
	state,
	transmutePerSec,
} from "./game.js";
import Sparticles from "./lib/sparticles.js";
import { applyOfflineProgress, load, startAutosave } from "./save.js";
import "./game-card.js";
import {
	addCard,
	buildAchievementUI,
	buildUpgradeUI,
	getActiveCard,
	hand,
	layoutHand,
	updateUI,
} from "./ui.js";

window.Data = Data;

// ---------- world ----------

var iso = new Isomer(document.getElementById("world"));
var Shape = Isomer.Shape;
var Point = Isomer.Point;
var Color = Isomer.Color;

function initWorld() {
	iso.add(
		Shape.Prism(Point(Point.ORIGIN.x, Point.ORIGIN.y, -2), 5, 5, -5),
		new Color(193, 180, 137),
	);
	iso.add(
		Shape.Prism(Point(Point.ORIGIN.x, Point.ORIGIN.y, -2), 5, 5, 10),
		new Color(50, 60, 160, 0.5),
	);
}

// ---------- game loop ----------

let lastTime = null;

function gameTick(dt) {
	state.mana += manaPerSec() * (dt / 1000);
	state.stats.totalMana += manaPerSec() * (dt / 1000);

	const { hearts, diamonds, spades, clubs } = getHandInfo();
	const rate = transmutePerSec();

	function transmute(resource, count) {
		if (count <= 0 || state.mana <= 0) return;
		const delta = Math.min(state.mana, count * rate * (dt / 1000));
		state.mana -= delta;
		state[resource] += delta;
		state.stats[`total${resource[0].toUpperCase()}${resource.slice(1)}`] +=
			delta;
	}

	// red cards transmute energy from mana
	transmute("energy", hearts + diamonds);

	// black cards transmute control from mana
	transmute("control", spades + clubs);

	checkAchievements();
	updateUI();
}

setInterval(() => {
	const now = Date.now();
	if (lastTime === null) lastTime = now;
	const dt = now - lastTime;
	lastTime = now;
	gameTick(dt);
}, 1000 / 25);

// ---------- boot ----------

window.onload = async () => {
	new Sparticles(document.getRootNode().body, Data.sparticle.abyss);
	initWorld();
	await load();
	buildUpgradeUI();
	buildAchievementUI();

	for (const c of state.cards) addCard(c.rank, c.suite, hand, false);
	applyOfflineProgress();

	document.addEventListener("click", (e) => {
		if (!e.target.closest("#left-panel")) getActiveCard()?._deselect();
	});
	document.querySelectorAll(".title-bar .minimize").forEach((btn) => {
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			btn.closest(".window").classList.toggle("minimized");
		});
	});

	startAutosave();
	updateUI();
	window.addEventListener("resize", layoutHand);
};
