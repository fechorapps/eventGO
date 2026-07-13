import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { extname, join, resolve, sep } from 'path';

export async function POST(request: Request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique safe filename
    const originalName = file.name.toLowerCase().replace(/\\/g, '/').split('/').pop() || 'upload';
    const ext = extname(originalName).toLowerCase();
    const stem = (ext ? originalName.slice(0, -ext.length) : originalName)
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'upload';
    const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : '';
    const uniqueName = `${Date.now()}-${Math.floor(Math.random() * 1000000)}-${stem}${safeExt}`;
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const publicPath = join(uploadsDir, uniqueName);
    const resolvedUploadsDir = resolve(uploadsDir) + sep;
    const resolvedPublicPath = resolve(publicPath);

    if (!resolvedPublicPath.startsWith(resolvedUploadsDir)) {
      return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 });
    }

    // Write file to the public/uploads/ directory (creating it if the volume is fresh)
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(publicPath, buffer);

    const relativeUrl = `/uploads/${uniqueName}`;

    return NextResponse.json({ success: true, url: relativeUrl });
  } catch (error) {
    console.error('Error during file upload:', error);
    return NextResponse.json({ error: 'Error interno al subir el archivo' }, { status: 500 });
  }
}
