import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

const source = readFileSync("src/lib/mock-data.ts", "utf8");
const outputDir = join("public", "product-photos");
const attributionPath = join(outputDir, "attribution.json");
const attribution = existsSync(attributionPath) ? JSON.parse(readFileSync(attributionPath, "utf8")) : {};
const productNames = Array.from(new Set([...source.matchAll(/name: "([^"]+)"/g)].map((match) => match[1])))
  .filter((name) => !["Customer", "Suman Pal", "Arif Khan", "Mita Roy", "Rahul Das"].includes(name));

mkdirSync(outputDir, { recursive: true });

let downloaded = 0;
let skipped = 0;
let missing = 0;

for (const name of productNames) {
  const slug = slugify(name);
  const filePath = join(outputDir, `${slug}.jpg`);

  if (existsSync(filePath)) {
    skipped += 1;
    continue;
  }

  const image = await findCommonsImage(name);

  if (!image) {
    missing += 1;
    console.log(`missing: ${name}`);
    continue;
  }

  try {
    const response = await fetch(image.url, {
      headers: { "User-Agent": "TapasGroceryStore/1.0 Wikimedia photo downloader" },
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
      source_url: image.descriptionUrl,
      image_url: image.url,
      license: image.license,
      license_url: image.licenseUrl,
      provider: "Wikimedia Commons"
    };
    writeFileSync(attributionPath, JSON.stringify(attribution, null, 2), "utf8");
    downloaded += 1;
    console.log(`downloaded: ${name}`);
  } catch (error) {
    missing += 1;
    console.log(`failed: ${name} - ${error instanceof Error ? error.message : "unknown error"}`);
  }

  await delay(700);
}

console.log(JSON.stringify({ downloaded, skipped, missing, total: productNames.length }, null, 2));

async function findCommonsImage(name) {
  const queries = getQueries(name);

  for (const query of queries) {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "6",
      gsrlimit: "8",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      format: "json",
      origin: "*"
    });
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { "User-Agent": "TapasGroceryStore/1.0 Wikimedia photo downloader" },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      continue;
    }

    const data = await response.json();
    const pages = Object.values(data.query?.pages ?? {});
    const page = pages.find((item) => {
      const image = item.imageinfo?.[0];
      const url = String(image?.url ?? "").toLowerCase();
      return /\.(jpg|jpeg)(\?|$)/.test(url);
    });

    if (page) {
      const info = page.imageinfo[0];
      const meta = info.extmetadata ?? {};
      return {
        title: page.title,
        url: info.url,
        descriptionUrl: info.descriptionurl,
        creator: stripHtml(meta.Artist?.value ?? meta.Credit?.value ?? "Wikimedia Commons contributor"),
        license: stripHtml(meta.LicenseShortName?.value ?? meta.UsageTerms?.value ?? "Open license"),
        licenseUrl: meta.LicenseUrl?.value ?? ""
      };
    }
  }

  return null;
}

function getQueries(name) {
  const overrides = {
    "Miniket Rice": ["white rice grains"],
    "Rohu Fish Cut": ["rohu fish"],
    "Katla Fish Cut": ["catla fish"],
    "Char Magaz Seeds": ["melon seeds"],
    "Cow Ghee Pouch": ["ghee jar"],
    "Mosquito Liquid Refill": ["mosquito repellent device"],
    "Cigarette Flake Mint": ["cigarette pack"],
    "Cigarette Indie Mint": ["cigarette pack"],
    "Bidi Bundle": ["bidi cigarette"],
    "Zarda Pouch": ["chewing tobacco"],
    "Loose Tobacco Pouch": ["tobacco pouch"]
  };

  return [
    ...(overrides[name] ?? []),
    `${name} product`,
    `${name} food`,
    name
  ];
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripHtml(value) {
  return String(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
