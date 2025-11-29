import { NextRequest, NextResponse } from 'next/server';
import { downloadFromGridFS } from '@/lib/gridfs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    // Download image from GridFS
    const { buffer, contentType } = await downloadFromGridFS(id);

    // Return image with appropriate headers
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      { error: 'Image not found' },
      { status: 404 }
    );
  }
}
