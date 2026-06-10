import { createWriteStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

const outputDir = join("public", "product-photos");
const attributionPath = join(outputDir, "attribution.json");
const attribution = existsSync(attributionPath) ? JSON.parse(readFileSync(attributionPath, "utf8")) : {};

const targets = [
  ["Miniket Rice", ["miniket rice grains", "white rice grains close up"]],
  ["Muesli", ["muesli product photo", "muesli cereal"]],
  ["Urad Dal", ["urad dal black gram", "black gram lentils"]],
  ["Soyabean Chunks", ["soy chunks product", "textured soy protein chunks"]],
  ["Sunflower Seeds", ["sunflower seeds product photo", "sunflower seeds close up"]],
  ["Walnuts", ["walnuts product photo", "walnut kernels"]],
  ["Meat Masala", ["meat masala powder", "spice powder product"]],
  ["Schezwan Sauce", ["schezwan sauce jar", "chili garlic sauce jar"]],
  ["Mixed Pickle", ["mixed pickle jar", "indian mixed pickle"]],
  ["Khari Biscuit", ["khari biscuit", "puff pastry biscuit"]],
  ["Cake Rusk", ["cake rusk product", "rusk biscuit"]],
  ["Masala Peanuts", ["masala peanuts", "spiced peanuts"]],
  ["Namkeen Mixture", ["namkeen mixture", "indian snack mixture"]],
  ["Chanachur", ["chanachur snack", "indian snack mix"]],
  ["Bhujia", ["bhujia snack", "sev bhujia"]],
  ["Instant Vermicelli", ["vermicelli packet", "instant vermicelli"]],
  ["Ready Poha Mix", ["poha mix packet", "instant poha"]],
  ["Upma Mix", ["upma mix packet", "instant upma"]],
  ["Katla Fish Cut", ["catla fish", "fresh fish cut"]],
  ["Bleaching Powder", ["bleaching powder product", "white cleaning powder"]],
  ["Mop Refill", ["mop refill product", "mop head refill"]],
  ["Cling Film", ["cling film roll", "plastic food wrap roll"]],
  ["Dhoop Sticks", ["dhoop sticks", "incense dhoop sticks"]],
  ["Camphor", ["camphor tablets", "camphor product"]],
  ["Cotton Wicks", ["cotton wicks diya", "cotton lamp wicks"]],
  ["Sindoor", ["sindoor container", "vermillion powder container"]],
  ["Shaving Cream", ["shaving cream tube", "shaving cream product"]],
  ["Razor", ["razor product", "shaving razor"]],
  ["Baby Feeding Bottle", ["baby feeding bottle", "feeding bottle product"]],
  ["Dog Food", ["dog food kibble", "dog food product"]],
  ["Cat Litter", ["cat litter product", "cat litter bag"]],
  ["Cigarette Navy Cut", ["cigarette pack", "cigarettes pack product"]],
  ["Cigarette Flake Mint", ["mint cigarette pack", "cigarettes pack product"]],
  ["Cigarette Indie Mint", ["mint cigarette pack", "cigarettes pack product"]],
  ["Bidi Bundle", ["bidi bundle", "beedi cigarettes"]],
  ["Loose Tobacco Pouch", ["tobacco pouch", "loose tobacco pouch"]],
  ["Zarda Pouch", ["zarda pouch", "chewing tobacco pouch"]],
  ["Char Magaz Seeds", ["melon seeds kernels", "magaz seeds"]],
  ["Refined Soybean Oil", ["soybean oil bottle", "cooking oil bottle"]],
  ["Groundnut Oil", ["groundnut oil bottle", "peanut oil bottle"]],
  ["Cow Ghee Pouch", ["ghee pouch", "ghee product"]],
  ["Malai Paneer", ["paneer cubes", "fresh paneer"]],
  ["Jeera Cookies", ["jeera cookies", "cumin cookies"]],
  ["Elaichi Cookies", ["elaichi cookies", "cardamom cookies"]],
  ["Mosquito Liquid Refill", ["mosquito repellent refill", "mosquito liquid refill"]],
  ["Room Freshener", ["room freshener spray", "air freshener spray"]]
];

let downloaded = 0;
let skipped = 0;
let failed = 0;

for (const [name, queries] of targets) {
  const slug = slugify(name);
  const filePath = join(outputDir, `${slug}.jpg`);

  if (existsSync(filePath)) {
    skipped += 1;
    continue;
  }

  const image = await findImage(queries);

  if (!image) {
    failed += 1;
    console.log(`missing: ${name}`);
    continue;
  }

  try {
    const response = await fetch(image.url, {
      headers: { "User-Agent": "TapasGroceryStore/1.0 duplicate photo fixer" },
      signal: AbortSignal.timeout(18000)
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`);
    }

    await pipeline(response.body, createWriteStream(filePath));
    attribution[slug] = {
      product: name,
      file: `/product-photos/${slug}.jpg`,
      title: image.title,
      creator: image.creator,
      creator_url: image.creator_url,
      source_url: image.foreign_landing_url,
      image_url: image.url,
      license: image.license,
      license_version: image.license_version,
      license_url: image.license_url,
      provider: image.provider,
      attribution: image.attribution
    };
    writeFileSync(attributionPath, JSON.stringify(attribution, null, 2), "utf8");
    downloaded += 1;
    console.log(`downloaded: ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`failed: ${name} - ${error instanceof Error ? error.message : "unknown error"}`);
  }

  await delay(1250);
}

console.log(JSON.stringify({ downloaded, skipped, failed, total: targets.length }, null, 2));

async function findImage(queries) {
  for (const query of queries) {
    const url = `https://api.openverse.engineering/v1/images/?q=${encodeURIComponent(query)}&page_size=10&license_type=commercial&mature=false`;
    const response = await fetch(url, {
      headers: { "User-Agent": "TapasGroceryStore/1.0 duplicate photo fixer" },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      continue;
    }

    const data = await response.json();
    const result = data.results?.find(isUsableImage);

    if (result) {
      return result;
    }
  }

  return null;
}

function isUsableImage(result) {
  const url = String(result?.url ?? "").toLowerCase();
  const license = String(result?.license ?? "").toLowerCase();
  return /\.(jpg|jpeg|png|webp)(\?|$)/.test(url) && !license.includes("nc");
}

function slugify(value) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
