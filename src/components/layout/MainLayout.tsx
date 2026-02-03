import { ReactNode } from 'react';
import { TopNav } from './TopNav';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="container px-4 md:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
