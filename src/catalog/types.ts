export type Rarity = 'comun' | 'poco_comun' | 'rara' | 'epica' | 'legendaria';
export type LegalStatus = 'libre' | 'regulada' | 'protegida';
export type Habitat = 'mar' | 'dulce';

export interface Species {
  id: string;
  commonName: string;
  scientificName: string;
  habitats: Habitat[];
  group: string;
  rarity: Rarity;
  legal: LegalStatus;
  legalNote?: string;
  description: string;
  bestMonths: number[];
  zones: string;
}

export const RARITIES: Rarity[] = ['comun', 'poco_comun', 'rara', 'epica', 'legendaria'];
export const RARITY_LABEL: Record<Rarity, string> = {
  comun: 'Común',
  poco_comun: 'Poco común',
  rara: 'Rara',
  epica: 'Épica',
  legendaria: 'Legendaria',
};
