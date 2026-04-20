import React, { type ReactNode } from 'react';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  amountVisibility: 'hidden' | 'visible';
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange, amountVisibility }) => {
  return (
    <div className="min-h-screen flex flex-col" data-amount-visibility={amountVisibility}>
      <Header currentPage={currentPage} onPageChange={onPageChange} />
      <main className="flex-1 min-w-0 overflow-x-hidden px-3 py-4 sm:px-4 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-screen-2xl">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
