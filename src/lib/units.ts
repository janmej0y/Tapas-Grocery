export const WEIGHT_UNIT_OPTIONS = [
  "25 Gram",
  "50 Gram",
  "100 Gram",
  "200 Gram",
  "300 Gram",
  "500 Gram",
  "750 Gram",
  "1 Kg",
  "1.5 Kg",
  "2 Kg",
  "3 Kg",
  "4 Kg",
  "5 Kg"
];

export function getUnitMultiplier(unit: string) {
  const normalized = unit.toLowerCase();
  const numeric = Number.parseFloat(normalized);

  if (normalized.includes("kg")) {
    return numeric || 1;
  }

  if (normalized.includes("g")) {
    return (numeric || 1000) / 1000;
  }

  const pieces = normalized.match(/\d+/)?.[0];
  return pieces ? Number(pieces) : 1;
}

export function getUnitPrice(basePrice: number, unit: string, variantPrices?: Record<string, number>) {
  if (variantPrices?.[unit]) {
    return variantPrices[unit];
  }

  if (isWeightUnit(unit)) {
    return Math.max(1, Math.round(basePrice * getWeightStepMultiplier(unit)));
  }

  if (isVolumeUnit(unit)) {
    return Math.max(1, Math.round(basePrice * getVolumeMultiplier(unit)));
  }

  return Math.max(1, Math.round(basePrice * getUnitMultiplier(unit)));
}

export function getMeasuredUnitOptions(unit: string) {
  const normalized = unit.toLowerCase();

  if (normalized.includes("liter") || normalized.includes("litre") || normalized.includes(" ml") || normalized.endsWith("ml")) {
    return ["ml", "Liter"];
  }

  if (isWeightUnit(unit) || normalized.includes("mg")) {
    return ["mg", "Gram", "Kg"];
  }

  return ["number"];
}

export function getDefaultMeasuredUnit(unit: string) {
  return getMeasuredUnitOptions(unit)[0] ?? "number";
}

export function formatCartItemName(name: string, unit: string) {
  return `${name} (${unit})`;
}

export function buildWeightVariantPrices(basePrice: number) {
  return WEIGHT_UNIT_OPTIONS.reduce<Record<string, number>>((prices, unit) => {
    prices[unit] = getUnitPrice(basePrice, unit);
    return prices;
  }, {});
}

function isWeightUnit(unit: string) {
  const normalized = unit.toLowerCase();
  return normalized.includes("gram") || normalized.includes(" kg") || normalized.endsWith("kg") || normalized.includes(" g") || normalized.includes("mg");
}

function isVolumeUnit(unit: string) {
  const normalized = unit.toLowerCase();
  return normalized.includes("liter") || normalized.includes("litre") || normalized.includes(" ml") || normalized.endsWith("ml");
}

function getWeightStepMultiplier(unit: string) {
  const normalized = unit.toLowerCase();
  const numeric = Number.parseFloat(normalized) || 25;
  if (normalized.includes("mg")) {
    return (numeric / 1000) / 25;
  }
  const grams = normalized.includes("kg") ? numeric * 1000 : numeric;
  return grams / 25;
}

function getVolumeMultiplier(unit: string) {
  const normalized = unit.toLowerCase();
  const numeric = Number.parseFloat(normalized) || 1;

  if (normalized.includes("ml")) {
    return numeric / 1000;
  }

  return numeric;
}
