import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

const source = readFileSync("src/lib/mock-data.ts", "utf8");
const productNames = Array.from(new Set([...source.matchAll(/name: "([^"]+)"/g)].map((match) => match[1])))
  .filter((name) => !["Customer", "Suman Pal", "Arif Khan", "Mita Roy", "Rahul Das"].includes(name));
const outputDir = join("public", "product-photos");
const attributionPath = join(outputDir, "attribution.json");
const attribution = existsSync(attributionPath) ? JSON.parse(readFileSync(attributionPath, "utf8")) : {};

mkdirSync(outputDir, { recursive: true });

let downloaded = 0;
let skipped = 0;
let missing = 0;

for (const name of productNames) {
  const slug = slugify(name);
  const existing = findExistingPhoto(slug);

  if (existing) {
    skipped += 1;
    continue;
  }

  const result = await findImage(name);

  if (!result) {
    missing += 1;
    console.log(`missing: ${name}`);
    continue;
  }

  const fileName = `${slug}.jpg`;
  const filePath = join(outputDir, fileName);

  try {
    const response = await fetch(result.url, {
      headers: {
        "User-Agent": "TapasGroceryStore/1.0 product photo downloader"
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`);
    }

    await pipeline(response.body, createWriteStream(filePath));
    attribution[slug] = {
      product: name,
      file: `/product-photos/${fileName}`,
      title: result.title,
      creator: result.creator,
      creator_url: result.creator_url,
      source_url: result.foreign_landing_url,
      image_url: result.url,
      license: result.license,
      license_version: result.license_version,
      license_url: result.license_url,
      provider: result.provider,
      attribution: result.attribution
    };
    writeFileSync(attributionPath, JSON.stringify(attribution, null, 2), "utf8");
    downloaded += 1;
    console.log(`downloaded: ${name}`);
  } catch (error) {
    missing += 1;
    console.log(`failed: ${name} - ${error instanceof Error ? error.message : "unknown error"}`);
  }

  await delay(1100);
}

writeFileSync(attributionPath, JSON.stringify(attribution, null, 2), "utf8");
console.log(JSON.stringify({ downloaded, skipped, missing, total: productNames.length }, null, 2));

async function findImage(name) {
  const queries = getQueries(name);

  for (const query of queries) {
    const url = `https://api.openverse.engineering/v1/images/?q=${encodeURIComponent(query)}&page_size=5&license_type=commercial&mature=false`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "TapasGroceryStore/1.0 product photo downloader"
      },
      signal: AbortSignal.timeout(12000)
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

function getQueries(name) {
  const lower = name.toLowerCase();
  const overrides = {
    "ball pen": ["ball pen product photo isolated", "blue ballpoint pen"],
    envelope: ["paper envelope product photo", "white envelope isolated"],
    matchbox: ["matchbox matches product photo", "box of matches isolated"],
    pencil: ["wooden pencil product photo isolated"],
    eraser: ["eraser product photo isolated"],
    sharpener: ["pencil sharpener product photo"],
    "a4 paper": ["copy paper ream product photo"],
    "smoking rolling paper": ["rolling paper product photo"]
  };

  return [
    ...(overrides[lower] ?? []),
    `${name} product photo isolated`,
    `${name} product pack`,
    `${name} grocery product`,
    name
  ];
}

function isUsableImage(result) {
  if (!result?.url || result.mature) {
    return false;
  }

  const url = String(result.url).toLowerCase();
  const license = String(result.license ?? "").toLowerCase();

  return (
    /\.(jpg|jpeg|png|webp)(\?|$)/.test(url) &&
    !license.includes("nc") &&
    !license.includes("sampling")
  );
}

function findExistingPhoto(slug) {
  return existsSync(join(outputDir, `${slug}.jpg`));
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
