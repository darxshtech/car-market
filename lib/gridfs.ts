import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import connectDB from './mongodb';

let bucket: GridFSBucket | null = null;

/**
 * Get or create GridFS bucket for file storage
 */
export async function getGridFSBucket(): Promise<GridFSBucket> {
  if (bucket) {
    return bucket;
  }

  await connectDB();
  
  if (!mongoose.connection.db) {
    throw new Error('Database connection not established');
  }

  bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'images',
  });

  return bucket;
}

/**
 * Upload a file to GridFS
 * @param buffer File buffer
 * @param filename Original filename
 * @param contentType MIME type
 * @returns File ID and URL
 */
export async function uploadToGridFS(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<{ fileId: string; url: string }> {
  const bucket = await getGridFSBucket();

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: {
        uploadedAt: new Date(),
      },
    });

    uploadStream.on('error', (error) => {
      reject(error);
    });

    uploadStream.on('finish', () => {
      const fileId = uploadStream.id.toString();
      const url = `/api/images/${fileId}`;
      resolve({ fileId, url });
    });

    uploadStream.end(buffer);
  });
}

/**
 * Download a file from GridFS
 * @param fileId File ID
 * @returns File buffer and metadata
 */
export async function downloadFromGridFS(fileId: string): Promise<{
  buffer: Buffer;
  contentType: string;
  filename: string;
}> {
  const bucket = await getGridFSBucket();

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

    downloadStream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    downloadStream.on('error', (error) => {
      reject(error);
    });

    downloadStream.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      
      // Get file metadata
      const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
      const file = files[0];

      if (!file) {
        reject(new Error('File not found'));
        return;
      }

      resolve({
        buffer,
        contentType: file.contentType || 'application/octet-stream',
        filename: file.filename,
      });
    });
  });
}

/**
 * Delete a file from GridFS
 * @param fileId File ID
 */
export async function deleteFromGridFS(fileId: string): Promise<void> {
  const bucket = await getGridFSBucket();
  await bucket.delete(new ObjectId(fileId));
}

/**
 * Upload multiple files to GridFS
 * @param files Array of file objects with buffer, filename, and contentType
 * @returns Array of file URLs
 */
export async function uploadMultipleToGridFS(
  files: Array<{ buffer: Buffer; filename: string; contentType: string }>
): Promise<string[]> {
  const uploadPromises = files.map((file) =>
    uploadToGridFS(file.buffer, file.filename, file.contentType)
  );

  const results = await Promise.all(uploadPromises);
  return results.map((result) => result.url);
}
