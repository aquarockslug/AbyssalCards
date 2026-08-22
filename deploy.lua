local function build(files)
	print("Building game...")
	os.execute("zip index.zip " .. table.concat(files, " "))
end

local function push(file, address, channel)
	local target = string.format("%s:%s", address, channel)
	print(string.format("\nUploading %s to %s", file, target))
	os.execute(string.format("butler push %s %s", file, target))
end

local cards = {}
for _, rank in ipairs({ "ace", "2", "3", "4", "5", "6", "7", "8", "9", "10" }) do
	for _, suite in ipairs({ "spades", "clubs", "hearts", "diamonds" }) do
		table.insert(cards, string.format("./cards/%s_of_%s.svg", rank, suite))
	end
end

build({
	"./index.html",
	"./css/modern-normalize.css",
	"./css/system.css",
	"./css/microtip.css",
	"./css/style.css",
	"./css/fonts/ChicagoFLF.woff",
	"./css/fonts/ChicagoFLF.woff2",
	"./css/fonts/ChiKareGo2.woff",
	"./css/fonts/ChiKareGo2.woff2",
	"./css/fonts/FindersKeepers.woff",
	"./css/fonts/FindersKeepers.woff2",
	"./css/fonts/monaco.woff",
	"./css/fonts/monaco.woff2",
	"./css/icon/apple.svg",
	"./css/icon/button-abyss.svg",
	"./css/icon/button-default.svg",
	"./css/icon/button.svg",
	"./css/icon/checkmark.svg",
	"./css/icon/radio-border-focused.svg",
	"./css/icon/radio-border.svg",
	"./css/icon/radio-dot.svg",
	"./css/icon/scrollbar-down-active.svg",
	"./css/icon/scrollbar-down.svg",
	"./css/icon/scrollbar-left-active.svg",
	"./css/icon/scrollbar-left.svg",
	"./css/icon/scrollbar-right-active.svg",
	"./css/icon/scrollbar-right.svg",
	"./css/icon/scrollbar-up-active.svg",
	"./css/icon/scrollbar-up.svg",
	"./css/icon/select-button.svg",
	"./js/index.js",
	"./js/game.js",
	"./js/game-card.js",
	"./js/ui.js",
	"./js/save.js",
	"./js/lib/hover-tilt.js",
	"./js/lib/localforage.js",
	"./js/lib/sparticles.js",
	"./js/lib/vivus.js",
	"./js/lib/ZzFX.js",
	table.concat(cards, " "),
})
push("./index.zip", "aquarock/abyssalcards", "html5")
