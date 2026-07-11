import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';

// El output standalone solo sirve los archivos de public/ que existían en el
// build (manifest fijo): las imágenes subidas en runtime devolvían 404. Los
// archivos del build los sirve la capa estática con prioridad; el resto de
// /uploads/* cae aquí y se lee del volumen en el momento.

// Sin SVG: servido inline y same-origin puede ejecutar scripts embebidos (XSS).
const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;

  // Solo nombres planos generados por el endpoint de subida (sin rutas).
  if (!/^[a-z0-9._-]+$/i.test(file) || file.includes('..')) {
    return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 });
  }

  try {
    const data = await readFile(join(process.cwd(), 'public', 'uploads', file));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        // Los nombres llevan timestamp y sufijo aleatorio: nunca cambian de contenido.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }
}
