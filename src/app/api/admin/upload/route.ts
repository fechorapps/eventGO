import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';

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
    const cleanName = file.name.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
    const uniqueName = `${Date.now()}-${Math.floor(Math.random() * 1000000)}-${cleanName}`;
    const publicPath = join(process.cwd(), 'public', 'uploads', uniqueName);

    // Write file to the public/uploads/ directory
    await writeFile(publicPath, buffer);

    const relativeUrl = `/uploads/${uniqueName}`;

    return NextResponse.json({ success: true, url: relativeUrl });
  } catch (error) {
    console.error('Error during file upload:', error);
    return NextResponse.json({ error: 'Error interno al subir el archivo' }, { status: 500 });
  }
}
