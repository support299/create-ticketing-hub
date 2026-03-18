import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface LocationContextType {
  locationId: string | null;
  isInIframe: boolean;
}

const LocationContext = createContext<LocationContextType>({ locationId: null, isInIframe: false });

export function LocationProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  
  const locationId = useMemo(() => searchParams.get('id'), [searchParams]);
  const isInIframe = useMemo(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true; // blocked by CORS means we're in an iframe
    }
  }, []);

  return (
    <LocationContext.Provider value={{ locationId, isInIframe }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationId() {
  return useContext(LocationContext).locationId;
}

export function useIsInIframe() {
  return useContext(LocationContext).isInIframe;
}
