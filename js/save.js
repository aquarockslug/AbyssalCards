import { defaultState, state } from "./game.js";

const SAVE_KEY = "abyssalcards.save.v1";
const OFFLINE_CAP = 2 * 60 * 60 * 1000;

localforage.config({
	name: "AbyssalCards",
	driver: [
		localforage.INDEXEDDB,
		localforage.WEBSQL,
		localforage.LOCALSTORAGE,
	],
});

// Resilient storage: localforage -> direct localStorage -> in-memory.
// Some environments (file:// origins, sandboxed iframes, private mode) have no
// usable IndexedDB/WebSQL and may even block localStorage, so we degrade
// gracefully instead of throwing "No available storage method found".
const memoryStore = {};
let backend = null;

async function resolveBackend() {
	if (backend) return backend;
	try {
		await localforage.ready();
		backend = "localforage";
		return backend;
	} catch (_) {
		// localforage couldn't find any working driver; ignore and fall through
	}
	try {
		const probe = "__abyssalcards_probe__";
		localStorage.setItem(probe, "1");
		localStorage.removeItem(probe);
		backend = "localStorage";
		return backend;
	} catch (_) {
		backend = "memory";
		return backend;
	}
}

async function storeSet(key, value) {
	const b = await resolveBackend();
	if (b === "localforage") return localforage.setItem(key, value);
	if (b === "localStorage") {
		localStorage.setItem(key, JSON.stringify(value));
		return;
	}
	memoryStore[key] = JSON.parse(JSON.stringify(value));
}

async function storeGet(key) {
	const b = await resolveBackend();
	if (b === "localforage") return localforage.getItem(key);
	if (b === "localStorage") {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	}
	return memoryStore[key] ?? null;
}

async function storeRemove(key) {
	const b = await resolveBackend();
	if (b === "localforage") return localforage.removeItem(key);
	if (b === "localStorage") {
		localStorage.removeItem(key);
		return;
	}
	delete memoryStore[key];
}

let saveInterval = null;
let resetPending = false;

export function save() {
	state.lastSeen = Date.now();
	storeSet(SAVE_KEY, JSON.parse(JSON.stringify(state))).catch((e) =>
		console.error("Save failed:", e)
	);
}

export async function load() {
	try {
		let data = await storeGet(SAVE_KEY);
		// Migrate a legacy raw-localStorage save into the active backend.
		if (!data) {
			const raw = localStorage.getItem(SAVE_KEY);
			if (raw) {
				data = JSON.parse(raw);
				localStorage.removeItem(SAVE_KEY);
			}
		}
		if (!data) return;
		Object.assign(state, data);
		Object.assign(state.upgrades, defaultState().upgrades, data.upgrades);
		Object.assign(state.stats, defaultState().stats, data.stats);
		Object.assign(state.world, defaultState().world, data.world ?? {});
		if (!Array.isArray(state.cards)) state.cards = [];
		delete state.board; // legacy saves stored cards on a board
		delete state.achievements; // legacy saves tracked achievements
	} catch (e) {
		console.error("Failed to load save:", e);
	}
}

export function resetGame() {
	if (!confirm("Reset all progress?")) return;
	resetPending = true;
	if (saveInterval) clearInterval(saveInterval);
	storeRemove(SAVE_KEY)
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
