import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { listCustomSpecies } from '../data/api';
import { addSpecies, SPECIES } from './catalog';
import type { Species } from './types';

interface CatalogValue {
  species: Species[];
  version: number;
  addCustom(s: Species): void;
}

const CatalogContext = createContext<CatalogValue>({ species: SPECIES, version: 0, addCustom: () => {} });

/** Carga las especies añadidas por el grupo y hace que las pantallas se repinten al llegar. */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (status !== 'member') return;
    listCustomSpecies()
      .then((list) => {
        if (addSpecies(list)) setVersion((v) => v + 1);
      })
      .catch(() => {});
  }, [status]);

  const addCustom = useCallback((s: Species) => {
    if (addSpecies([s])) setVersion((v) => v + 1);
  }, []);

  return <CatalogContext.Provider value={{ species: SPECIES, version, addCustom }}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  return useContext(CatalogContext);
}
