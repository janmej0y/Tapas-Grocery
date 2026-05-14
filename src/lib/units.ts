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
  return variantPrices?.[unit] ?? Math.max(1, Math.round(basePrice * getUnitMultiplier(unit)));
}

export function formatCartItemName(name: string, unit: string) {
  return `${name} (${unit})`;
}
