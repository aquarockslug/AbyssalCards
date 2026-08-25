import { state } from "./game.js";

const RATE_SMOOTHING = 0.25;
let lastSample = null;
const observedRates = { mana: 0, energy: 0, control: 0, essence: 0 };

export function trackRates(dtMs) {
	const dt = dtMs / 1000;
	const sample = Object.fromEntries(
		Object.keys(observedRates).map((r) => [r, state[r]]),
	);
	if (!lastSample || dt <= 0) {
		lastSample = sample;
		return;
	}
	for (const r of Object.keys(observedRates)) {
		const instant = (sample[r] - lastSample[r]) / dt;
		observedRates[r] += (instant - observedRates[r]) * RATE_SMOOTHING;
	}
	lastSample = sample;
}

export const resourceRates = () => ({ ...observedRates });
