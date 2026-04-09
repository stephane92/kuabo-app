import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { lat, lng, type } = await req.json();
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

    const queries: Record<string, { keyword: string; type?: string }> = {
      ssn:    { keyword: "social security administration",  type: "local_government_office" },
      dmv:    { keyword: "motor vehicle administration DMV",type: "local_government_office" },
      bank:   { keyword: "Bank of America",                 type: "bank"                    },
      uscis:  { keyword: "USCIS immigration",               type: "local_government_office" },
      clinic: { keyword: "community health center",         type: "health"                  },
      food:   { keyword: "food bank pantry",                type: "food"                    },
    };

    const q = queries[type] || { keyword: type };

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&keyword=${encodeURIComponent(q.keyword)}${q.type ? `&type=${q.type}` : ""}&rankby=prominence&key=${key}`;

    const res  = await fetch(url);
    const data = await res.json();

    if (!data.results) {
      return NextResponse.json({ places: [] });
    }

    const places = data.results.slice(0, 5).map((p: any) => ({
      id:       p.place_id,
      name:     p.name,
      address:  p.vicinity,
      lat:      p.geometry.location.lat,
      lng:      p.geometry.location.lng,
      rating:   p.rating || null,
      open:     p.opening_hours?.open_now ?? null,
      distance: getDistance(lat, lng, p.geometry.location.lat, p.geometry.location.lng),
    }));

    // ── Trie par distance — le plus proche en premier
    places.sort((a: any, b: any) => {
      const distA = parseFloat(a.distance.replace(" km", "").replace(" m", ""));
      const distB = parseFloat(b.distance.replace(" km", "").replace(" m", ""));
      return distA - distB;
    });

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