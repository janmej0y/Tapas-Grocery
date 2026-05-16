import { NextResponse } from "next/server";

type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
};

type NominatimResponse = {
  display_name?: string;
  address?: NominatimAddress;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lon"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Valid latitude and longitude are required." }, { status: 400 });
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
    {
      headers: {
        "Accept-Language": "en-IN,en",
        "User-Agent": "TapasGroceryStore/1.0"
      },
      next: { revalidate: 60 * 60 * 24 }
    }
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Address lookup failed. Please edit the address manually." }, { status: 502 });
  }

  const data = (await response.json()) as NominatimResponse;
  const address = data.address ?? {};
  const street = [address.house_number, address.road].filter(Boolean).join(", ");
  const locality = address.neighbourhood ?? address.suburb ?? address.village ?? address.town ?? address.city ?? "";
  const city = address.city ?? address.town ?? address.village ?? address.county ?? "";

  return NextResponse.json({
    line1: street || firstAddressPart(data.display_name),
    line2: locality,
    city,
    state: address.state ?? "West Bengal",
    pincode: address.postcode ?? "",
    landmark: data.display_name ?? ""
  });
}

function firstAddressPart(value?: string) {
  return value?.split(",").map((part) => part.trim()).find(Boolean) ?? "";
}
