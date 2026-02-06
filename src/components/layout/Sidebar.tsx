'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  RotateCcw,
  Settings,
  LogOut,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mağazalar', href: '/stores', icon: Store },
  { name: 'Stok', href: '/inventory', icon: Package },
  { name: 'Siparişler', href: '/orders', icon: ShoppingCart },
  { name: 'Ödemeler', href: '/payments', icon: CreditCard },
  { name: 'Kâr Analizi', href: '/profit', icon: TrendingUp },
  { name: 'İadeler', href: '/refunds', icon: RotateCcw },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuthStore();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <BarChart3 className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold">WC Analytics</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Button
              key={item.name}
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn('w-full justify-start gap-3')}
              asChild
            >
              <Link href={item.href}>
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            </Button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div className="mb-3 rounded-lg bg-muted p-3">
          <p className="text-sm font-medium">{user?.name || user?.email || 'Kullanıcı'}</p>
          <p className="text-xs text-muted-foreground">{user?.plan?.name || 'Free'} Plan</p>
        </div>
        <Separator className="my-2" />
        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-3" asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" />
              Ayarlar
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Çıkış Yap
          </Button>
        </div>
      </div>
    </div>
  );
}
