import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { lat, lng, type } = await req.json();
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

    const queries: Record<string, string> = {
      ssn:     "social security administration office",
      dmv:     "motor vehicle administration",
      bank:    "Chase Bank OR Bank of America",
      uscis:   "USCIS immigration office",
      clinic:  "free clinic community health center",
      food:    "food bank",
    };

    const query = queries[type] || type;

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&keyword=${encodeURIComponent(query)}&key=${key}`;

    const res  = await fetch(url);
    const data = await res.json();

    const places = (data.results || []).slice(0, 5).map((p: any) => ({
      id:       p.place_id,
      name:     p.name,
      address:  p.vicinity,
      lat:      p.geometry.location.lat,
      lng:      p.geometry.location.lng,
      rating:   p.rating || null,
      open:     p.opening_hours?.open_now ?? null,
      distance: getDistance(lat, lng, p.geometry.location.lat, p.geometry.location.lng),
    }));

    return NextResponse.json({ places });

  } catch (err) {
    console.error("Places API error:", err);
    return NextResponse.json({ error: "Error fetching places" }, { status: 500 });
  }
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return d < 1 ? Math.round(d * 1000) + " m" : d.toFixed(1) + " km";
}