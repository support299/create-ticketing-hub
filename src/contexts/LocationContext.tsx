import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface LocationContextType {
  locationId: string | null;
}

const LocationContext = createContext<LocationContextType>({ locationId: null });

export function LocationProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  
  const locationId = useMemo(() => searchParams.get('id'), [searchParams]);

  return (
    <LocationContext.Provider value={{ locationId }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationId() {
  return useContext(LocationContext).locationId;
}
