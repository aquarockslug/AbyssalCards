import { defaultState, manaPerSec, state } from "./game.js";

const SAVE_KEY = "abyssalcards.save.v1";
const OFFLINE_CAP = 2 * 60 * 60 * 1000;

localforage.config({ name: "AbyssalCards" });

let saveInterval = null;
let resetPending = false;

export function save() {
	state.lastSeen = Date.now();
	localforage
		.setItem(SAVE_KEY, JSON.parse(JSON.stringify(state)))
		.catch((e) => console.error("Save failed:", e));
}

export async function load() {
	try {
		let data = await localforage.getItem(SAVE_KEY);
		if (!data) {
			const raw = localStorage.getItem(SAVE_KEY);
			if (raw) {
				data = JSON.parse(raw);
				await localforage.setItem(SAVE_KEY, JSON.parse(JSON.stringify(data)));
				localStorage.removeItem(SAVE_KEY);
			}
		}
		if (!data) return;
		Object.assign(state, data);
		Object.assign(state.upgrades, defaultState().upgrades, data.upgrades);
		Object.assign(state.stats, defaultState().stats, data.stats);
		if (!Array.isArray(state.achievements)) state.achievements = [];
		if (!Array.isArray(state.cards)) state.cards = [];
		if (!Array.isArray(state.board)) state.board = [];
	} catch (e) {
		console.error("Failed to load save:", e);
	}
}

export function resetGame() {
	if (!confirm("Reset all progress?")) return;
	resetPending = true;
	if (saveInterval) clearInterval(saveInterval);
	localforage
		.removeItem(SAVE_KEY)
		.catch(() => {})
		.finally(() => {
			localStorage.removeItem(SAVE_KEY);
			location.reload();
		});
}

export function startAutosave() {
	saveInterval = setInterval(save, 10000);
	window.addEventListener("beforeunload", () => {
		if (!resetPending) save();
	});
}

window.saveGame = save;
window.resetGame = resetGame;
