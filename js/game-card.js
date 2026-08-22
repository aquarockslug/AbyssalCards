// a custom web component representing a card in the game
// they have a rank and suite attribute

import "./lib/hover-tilt.js";

class Card extends HTMLElement {
	static observedAttributes = ["rank", "suite"];

	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this._face = this._vivus = this._abortController = null;
		this._originalRank = this._originalSuite = null;

		// unselect this card if the window is resized
		addEventListener(
			"resize",
			(event) => this._selected && this._toggleSelect(),
		);
	}

	connectedCallback() {
		this.addEventListener("click", (e) => {
			e.stopPropagation();
			this._toggleSelect();
		});

		const slot = document.createElement("slot");
		const hoverTilt = document.createElement("hover-tilt");
		for (const [k, v] of Data.card.effects) hoverTilt.setAttribute(k, v);

		const style = document.createElement("style");
		style.textContent = `:host{display:inline-block}hover-tilt{display:flex}::slotted(svg){display:block;border-radius:10px;width:250px;height:auto;background:${Data.card.background};border:2px solid #fff}`;

		hoverTilt.appendChild(slot);
		this.shadowRoot.append(style, hoverTilt);
		this._updateFace();
	}

	_toggleSelect() {
		if (this._selected) return this._deselect();

		const current = document
			.getElementById("hand")
			?.querySelector("game-card[active]");
		if (current && current !== this) current._deselect();

		this._selected = true;
		this.setAttribute("active", "");

		const tilt = this.shadowRoot?.querySelector("hover-tilt");
		if (tilt) {
			this._prevScaleFactor = tilt.getAttribute("scale-factor");
			tilt.setAttribute("scale-factor", "1");
		}

		const { left, width, top, height } = this.getBoundingClientRect();
		const deltaX = window.innerWidth / 2 - left - width / 2;
		const deltaY = window.innerHeight * 0.6 - top - height / 2;
		this.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.25)`;
		this.dispatchEvent(new CustomEvent("card-select", { bubbles: true }));
	}

	_deselect() {
		this._selected = false;
		this.removeAttribute("active");

		const tilt = this.shadowRoot?.querySelector("hover-tilt");
		if (tilt && this._prevScaleFactor != null) {
			tilt.setAttribute("scale-factor", this._prevScaleFactor);
		}

		requestAnimationFrame(() => {
			this.style.transform = "";
		});
		this.dispatchEvent(new CustomEvent("card-deselect", { bubbles: true }));
	}

	attributeChangedCallback(_name, oldVal, newVal) {
		if (newVal !== oldVal) this._updateFace();
	}

	async _updateFace() {
		const rank = this.getAttribute("rank");
		const suite = this.getAttribute("suite");
		if (!rank || !suite) return;
		if (!this._originalRank) {
			this._originalRank = rank;
			this._originalSuite = suite;
		}
		const isChanged =
			rank !== this._originalRank || suite !== this._originalSuite;

		if (this._abortController) this._abortController.abort();
		if (this._vivus) {
			const vivus = this._vivus;
			this._vivus = null;
			await new Promise((resolve) => vivus.play(-1, resolve));
		}

		const oldFace = this._face;
		this._abortController = new AbortController();
		const { signal } = this._abortController;

		try {
			const res = await fetch(`cards/${rank}_of_${suite}.svg`, {
				signal,
			});
			const text = await res.text();
			if (signal.aborted) return;

			const svg = new DOMParser()
				.parseFromString(text, "image/svg+xml")
				.querySelector("svg");
			if (!svg) return;

			this._face = document.importNode(svg, true);
			oldFace
				? this.replaceChild(this._face, oldFace)
				: this.appendChild(this._face);

			if (isChanged) {
				window.data.sfx.magic();
				this._vivus = new Vivus(this._face, {
					type: "sync",
					duration: 20,
				});
			}

			this._face.querySelectorAll("path").forEach((p) => {
				p.style.stroke = "#fff";
				p.style.fillOpacity = "0";
			});

			this._updateGlow();
		} catch (e) {
			if (e.name !== "AbortError") console.error("Card fetch error:", e);
		}
	}

	_updateGlow() {
		const rank = this.getAttribute("rank");
		const suite = this.getAttribute("suite");
		if (!this._face || !rank || !suite) return;

		const value = rank === "ace" ? 1 : Number(rank);
		if (!Number.isFinite(value)) return;
		const strength = Math.min(Math.max((value - 3) / 9, 0), 1);

		const [r, g, b] =
			suite === "hearts" || suite === "diamonds"
				? [255, 45, 85]
				: [52, 211, 153];

		const blur = Math.round(15 + 75 * strength);
		const spread = Math.round(2 + 13 * strength);
		const alpha = (0.35 + 0.55 * strength).toFixed(2);
		this._face.style.boxShadow = `0px 0px ${blur}px ${spread}px rgba(${r},${g},${b},${alpha})`;
	}
}

customElements.define("game-card", Card);
