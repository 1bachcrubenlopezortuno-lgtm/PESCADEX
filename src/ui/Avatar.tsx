import { useState } from 'react';
import type { Profile } from '../data/types';

/** Foto de perfil, o la inicial si no tiene (o si la foto ya no existe). */
export function Avatar({ profile, size = 64, className = '' }: { profile: Pick<Profile, 'displayName' | 'avatarUrl'>; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const initial = profile.displayName.trim().charAt(0).toUpperCase();
  return (
    <div className={`avatar ${className}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {profile.avatarUrl && !broken ? (
        <img src={profile.avatarUrl} alt={`Foto de ${profile.displayName}`} onError={() => setBroken(true)} />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </div>
  );
}
