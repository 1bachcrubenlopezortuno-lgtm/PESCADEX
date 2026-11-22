export interface Profile {
  id: string;
  displayName: string;
  avatarPath: string | null;
}

export type OutingMode = 'surfcasting' | 'spinning' | 'barco' | 'embalse' | 'rio' | 'otra';

export const OUTING_MODE_LABEL: Record<OutingMode, string> = {
  surfcasting: 'Surfcasting',
  spinning: 'Spinning',
  barco: 'Barco',
  embalse: 'Embalse',
  rio: 'Río',
  otra: 'Otra',
};

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Outing {
  id: string;
  ownerId: string;
  startedAt: string;
  endedAt: string | null;
  mode: OutingMode;
  note: string | null;
  companionIds: string[];
  approx: LatLng | null;
  exact: LatLng | null;
  shareExact: boolean;
}

export interface Catch {
  id: string;
  outingId: string;
  userId: string;
  speciesId: string;
  caughtAt: string;
  weightG: number | null;
  lengthCm: number | null;
  bait: string | null;
  note: string | null;
  shareExact: boolean;
  approx: LatLng | null;
  exact: LatLng | null;
  photoUrls: string[];
}

export interface NewCatch {
  id: string;
  outingId: string;
  speciesId: string;
  caughtAt: string;
  weightG?: number;
  lengthCm?: number;
  bait?: string;
  note?: string;
  shareExact: boolean;
  location: LatLng | null;
}

export interface NewOuting {
  id: string;
  startedAt: string;
  mode: OutingMode;
  companionIds: string[];
  location: LatLng | null;
  shareExact: boolean;
  note?: string;
}
