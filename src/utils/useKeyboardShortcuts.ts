import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onEscape?: () => void;
}

export function useKeyboardShortcuts({ onEscape }: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Only let Escape through for inputs
        if (e.key === 'Escape' && onEscape) {
          e.preventDefault();
          onEscape();
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape]);
}
