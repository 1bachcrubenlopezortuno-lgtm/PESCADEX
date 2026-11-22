import piexif from 'piexifjs';
import { preparePhoto } from './photo';

async function jpegWithGps(width: number, height: number): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  // ruido para que la imagen pese de verdad
  const img = ctx.createImageData(width, height);
  for (let i = 0; i < img.data.length; i++) img.data[i] = (i * 2654435761) & 255;
  ctx.putImageData(img, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const exif = piexif.dump({
    GPS: {
      [piexif.GPSIFD.GPSLatitudeRef]: 'N',
      [piexif.GPSIFD.GPSLatitude]: [[36, 1], [31, 1], [3756, 100]],
      [piexif.GPSIFD.GPSLongitudeRef]: 'W',
      [piexif.GPSIFD.GPSLongitude]: [[6, 1], [17, 1], [1896, 100]],
    },
  });
  const withExif = piexif.insert(exif, dataUrl);
  const bytes = Uint8Array.from(atob(withExif.split(',')[1]), (c) => c.charCodeAt(0));
  return new File([bytes], 'foto.jpg', { type: 'image/jpeg' });
}

function containsExif(bytes: Uint8Array): boolean {
  const sig = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
  outer: for (let i = 0; i < bytes.length - sig.length; i++) {
    for (let j = 0; j < sig.length; j++) if (bytes[i + j] !== sig[j]) continue outer;
    return true;
  }
  return false;
}

test('la foto se comprime a 1600 px, < 1 MB y sin EXIF de GPS', async () => {
  const file = await jpegWithGps(4000, 3000);
  expect(file.size).toBeGreaterThan(1_000_000);
  expect(containsExif(new Uint8Array(await file.arrayBuffer()))).toBe(true);

  const out = await preparePhoto(file);

  expect(out.type).toBe('image/jpeg');
  expect(out.size).toBeLessThan(1_000_000);
  const bmp = await createImageBitmap(out);
  expect(Math.max(bmp.width, bmp.height)).toBe(1600);
  expect(containsExif(new Uint8Array(await out.arrayBuffer()))).toBe(false);
}, 60_000);
