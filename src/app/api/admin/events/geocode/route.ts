import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';

// Server-side proxy to OpenStreetMap's Nominatim search, used by the
// Ubicaciones step's "Buscar en el mapa" button. Kept server-side for two
// reasons, not just one: Nominatim's usage policy requires a descriptive
// User-Agent identifying the calling application, which a browser fetch
// cannot set itself — and it also keeps this to one request per explicit
// click (no autocomplete-as-you-type), staying comfortably inside their
// ~1 req/sec guidance without needing any throttling machinery.
export async function GET(request: Request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    if (!q) {
      return NextResponse.json({ error: 'Falta la dirección a buscar' }, { status: 400 });
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'eventGO/1.0 (invitaciones digitales; contacto: admin@eventgo.local)',
        'Accept-Language': 'es',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'El servicio de mapas no respondió' }, { status: 502 });
    }

    const results = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!results.length) {
      return NextResponse.json({ found: false });
    }

    const { lat, lon, display_name } = results[0];
    return NextResponse.json({
      found: true,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      displayName: display_name,
    });
  } catch (error) {
    console.error('Error geocoding address:', error);
    return NextResponse.json({ error: 'Error al buscar la dirección' }, { status: 500 });
  }
}
