import { useLocationId } from '@/contexts/LocationContext';
import { Lock } from 'lucide-react';

export function LocationGuard({ children }: { children: React.ReactNode }) {
  const locationId = useLocationId();

  if (!locationId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-muted-foreground">
        <Lock className="h-16 w-16" />
        <h1 className="text-2xl font-semibold text-foreground">Access Restricted</h1>
      </div>
    );
  }

  return <>{children}</>;
}
