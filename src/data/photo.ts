import imageCompression from 'browser-image-compression';

/** Comprime la foto a JPEG de ≤1600 px. El re-codificado con canvas elimina los metadatos EXIF (GPS incluido). */
export async function preparePhoto(file: File): Promise<Blob> {
  return imageCompression(file, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 0.9,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
    preserveExif: false,
    useWebWorker: true,
  });
}
