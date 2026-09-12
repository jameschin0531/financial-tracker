import { describe, expect, it } from 'bun:test';
import { addCategory, isCategoryInUse, removeCategory, resolveCategory } from '../../src/utils/categoryList';

describe('addCategory', () => {
  it('appends a trimmed category', () => {
    expect(addCategory(['Food'], '  Travel  ')).toEqual(['Food', 'Travel']);
  });

  it('ignores blank input', () => {
    const categories = ['Food'];
    expect(addCategory(categories, '   ')).toBe(categories);
  });

  it('ignores case-insensitive duplicates', () => {
    const categories = ['Food'];
    expect(addCategory(categories, 'food')).toBe(categories);
  });

  it('does not mutate the input', () => {
    const categories = ['Food'];
    addCategory(categories, 'Travel');
    expect(categories).toEqual(['Food']);
  });
});

describe('removeCategory', () => {
  it('removes a matching category', () => {
    expect(removeCategory(['Food', 'Travel'], 'Food')).toEqual(['Travel']);
  });

  it('matches case-insensitively and ignores surrounding space', () => {
    expect(removeCategory(['Food', 'Travel'], ' food ')).toEqual(['Travel']);
  });

  it('returns the same array when nothing matches', () => {
    const categories = ['Food'];
    expect(removeCategory(categories, 'Travel')).toBe(categories);
    expect(removeCategory(categories, '  ')).toBe(categories);
  });

  it('does not mutate the input', () => {
    const categories = ['Food', 'Travel'];
    removeCategory(categories, 'Food');
    expect(categories).toEqual(['Food', 'Travel']);
  });
});

describe('isCategoryInUse', () => {
  const expenses = [{ category: 'Food' }, { category: ' Travel ' }];

  it('detects a referenced category', () => {
    expect(isCategoryInUse(expenses, 'food')).toBe(true);
    expect(isCategoryInUse(expenses, 'Travel')).toBe(true);
  });

  it('returns false for unused or blank categories', () => {
    expect(isCategoryInUse(expenses, 'Housing')).toBe(false);
    expect(isCategoryInUse(expenses, '  ')).toBe(false);
  });
});

describe('resolveCategory', () => {
  it('returns the stored spelling for a case-insensitive match', () => {
    expect(resolveCategory(['Food', 'Travel'], 'food')).toBe('Food');
  });

  it('returns the trimmed input when the category is new', () => {
    expect(resolveCategory(['Food'], '  Travel ')).toBe('Travel');
  });
});
