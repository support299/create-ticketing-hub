import { Calendar, LayoutDashboard, Users, ShoppingCart, QrCode, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Calendar, label: 'Events', href: '/events' },
  { icon: ShoppingCart, label: 'Orders', href: '/orders' },
  { icon: Users, label: 'Attendees', href: '/attendees' },
  { icon: QrCode, label: 'Check-in', href: '/check-in' },
];

export function TopNav() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 items-center justify-center px-4 md:px-8">
        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile menu placeholder */}
        <button className="md:hidden p-2 rounded-lg hover:bg-muted">
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
