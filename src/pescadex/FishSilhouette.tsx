import type { Species } from '../catalog/types';

const SHAPES: Record<string, string> = {
  default: 'M8 32c10-14 30-18 44-10l10-8v36l-10-8C38 50 18 46 8 32z',
  long: 'M4 32c14-8 40-10 54-4l6-6v20l-6-6C44 42 18 40 4 32z',
  flat: 'M10 32c4-16 28-22 42-14l8-6v40l-8-6C38 54 14 48 10 32z',
  ceph: 'M32 6c10 0 16 10 16 22 0 6-2 10-4 12l6 16-8-10-2 14-6-14-2 14-6-14-2 14-2-14-8 10 6-16c-2-2-4-6-4-12C16 16 22 6 32 6z',
};

function shapeFor(s: Species): string {
  if (s.group === 'Cefalópodos') return SHAPES.ceph;
  if (['Anguílidos', 'Cóngridos', 'Murénidos', 'Belónidos', 'Triquiúridos', 'Esfirénidos', 'Esócidos'].includes(s.group)) return SHAPES.long;
  if (['Pleuronectiformes', 'Rájidos', 'Espáridos', 'Centrárquidos'].includes(s.group)) return SHAPES.flat;
  return SHAPES.default;
}

export function FishSilhouette({ species, revealed, size = 56 }: { species: Species; revealed: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 68 64" width={size} height={size} aria-hidden="true">
      <path d={shapeFor(species)} fill={revealed ? `var(--r-${species.rarity})` : '#1d2a33'} opacity={revealed ? 1 : 0.85} />
      {revealed && species.group !== 'Cefalópodos' && <circle cx="16" cy="29" r="2.5" fill="#fff" />}
    </svg>
  );
}
