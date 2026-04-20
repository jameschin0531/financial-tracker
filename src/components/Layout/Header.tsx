import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAmountVisibility } from '../../context/AmountVisibilityContext';
import ThemeToggle from './ThemeToggle';
import ExportButton from '../Export/ExportButton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  Menu,
  Eye,
  EyeOff,
  LogOut,
  LayoutDashboard,
  Wallet,
  CreditCard,
  TrendingUp,
  BarChart3,
  Bitcoin,
} from 'lucide-react';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'assets', label: 'Assets', icon: Wallet },
  { id: 'liabilities', label: 'Liabilities', icon: CreditCard },
  { id: 'cashflow', label: 'Cash Flow', icon: TrendingUp },
  { id: 'stocks', label: 'Stocks', icon: BarChart3 },
  { id: 'crypto', label: 'Crypto', icon: Bitcoin },
] as const;

const Header: React.FC<HeaderProps> = ({ currentPage, onPageChange }) => {
  const { user, signOut } = useAuth();
  const { hideAmounts, toggleAmountVisibility } = useAmountVisibility();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      setSigningOut(false);
    }
  };

  const handleNav = (id: string) => {
    onPageChange(id);
    setMobileNavOpen(false);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between h-14 px-3 sm:px-4 gap-2">
        {/* Left: Hamburger (mobile) + Desktop Nav */}
        <div className="flex items-center gap-1 min-w-0">
          {/* Mobile hamburger */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <nav className="flex flex-col gap-1 mt-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                        'hover:bg-accent hover:text-accent-foreground',
                        isActive && 'bg-accent text-accent-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-accent text-accent-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              disabled={signingOut}
              title={signingOut ? 'Signing out...' : 'Sign out'}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
          <ExportButton />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleAmountVisibility}
            aria-label={hideAmounts ? 'Show all amounts' : 'Hide all amounts'}
            title={hideAmounts ? 'Show all amounts' : 'Hide all amounts'}
          >
            {hideAmounts ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
