import { useLocationId } from '@/contexts/LocationContext';
import { Lock } from 'lucide-react';

export function LocationGuard({ children }: { children: React.ReactNode }) {
  const locationId = useLocationId();

  if (!locationId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-muted-foreground">
        <Lock className="h-16 w-16" />
        <h1 className="text-2xl font-semibold text-foreground">Access Restricted</h1>
        <p className="text-center max-w-md">
          This page requires a valid location ID. Please access the portal using a valid URL with the <code className="bg-muted px-1.5 py-0.5 rounded text-sm">?id=</code> parameter.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
