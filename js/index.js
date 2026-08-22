import Data, {
	activeCard,
	blackValue,
	manaPerSec,
	redValue,
	state,
	trackRates,
	transmutePerSec,
} from "./game.js";
import Sparticles from "./lib/sparticles.js";
import { load, startAutosave } from "./save.js";
import "./game-card.js";
import { addCard, buildUpgradeUI, hand, layoutHand, updateUI } from "./ui.js";

window.Data = Data;

// ---------- game loop ----------

let lastTime = null;

function gameTick(dt) {
	trackRates(dt);
	state.mana += manaPerSec() * (dt / 1000);
	state.stats.totalMana += manaPerSec() * (dt / 1000);

	const red = redValue();
	const black = blackValue();
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
	if (red > 0) transmute("energy", red);

	// black cards transmute control from mana
	if (black > 0) transmute("control", black);

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
	await load();
	buildUpgradeUI();

	for (const c of state.cards) addCard(c.rank, c.suite, hand, false);

	document.addEventListener("click", (e) => {
		if (!e.target.closest("#left-panel")) activeCard()?._deselect();
	});
	document.querySelectorAll(".title-bar .minimize").forEach((btn) => {
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			btn.closest(".window").classList.toggle("minimized");
		});
	});

	startAutosave();
	updateUI();
	window.addEventListener("resize", () => {
		layoutHand();
	});
};
