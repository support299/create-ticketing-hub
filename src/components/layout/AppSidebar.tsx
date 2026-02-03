import { Calendar, LayoutDashboard, Users, ShoppingCart, QrCode, Ticket } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Calendar, label: 'Events', href: '/events' },
  { icon: ShoppingCart, label: 'Orders', href: '/orders' },
  { icon: Users, label: 'Attendees', href: '/attendees' },
  { icon: QrCode, label: 'Check-in', href: '/check-in' },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 gradient-dark border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary glow-primary">
            <Ticket className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-sidebar-foreground">
            Tick<span className="text-gradient">Flow</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-6">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-sidebar-accent p-4">
            <p className="text-xs text-sidebar-foreground/60">
              Need help?
            </p>
            <p className="mt-1 text-sm font-medium text-sidebar-foreground">
              View Documentation
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
