import type { Species } from '../catalog/types';
import { FishSilhouette } from './FishSilhouette';

// Ilustraciones en src/catalog/art/<id>.<ext>; las que falten usan el pez genérico.
const files = import.meta.glob('../catalog/art/*.{png,jpg,jpeg,webp,svg}', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const ART: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace(/\.[^.]+$/, ''), url]),
);

export function speciesImage(id: string): string | undefined {
  return ART[id];
}

/** Dibujo de la especie: interrogación si no está capturada, ilustración (o pez genérico) si lo está. */
export function SpeciesArt({ species, revealed, size = 64 }: { species: Species; revealed: boolean; size?: number }) {
  if (!revealed) {
    return (
      <span className="art art-unknown" data-testid="art-unknown" style={{ width: size, height: size, fontSize: size * 0.55 }} aria-hidden="true">
        {species.legal === 'protegida' ? '🔒' : '?'}
      </span>
    );
  }
  const img = ART[species.id];
  return (
    <span className="art art-revealed" data-testid="art-revealed" style={{ width: size, height: size }} aria-hidden="true">
      {img ? <img src={img} alt="" width={size} height={size} /> : <FishSilhouette species={species} revealed size={size} />}
    </span>
  );
}
