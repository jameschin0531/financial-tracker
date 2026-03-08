export interface AllocationItem {
  name: string;
  value: number;
}

export interface AllocationBreakdownRow {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

const DEFAULT_COLOR = '#94a3b8';

const roundToOneDecimal = (value: number): number => Math.round(value * 10) / 10;

export const buildAllocationBreakdown = (
  allocation: AllocationItem[],
  colors: string[],
  maxVisibleSlices = 6,
): AllocationBreakdownRow[] => {
  const cleanItems = allocation
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
    .sort((a, b) => b.value - a.value);

  if (cleanItems.length === 0) {
    return [];
  }

  const safeMaxVisibleSlices = Math.max(2, maxVisibleSlices);

  let slices = cleanItems;
  if (cleanItems.length > safeMaxVisibleSlices) {
    const visibleCount = safeMaxVisibleSlices - 1;
    const topSlices = cleanItems.slice(0, visibleCount);
    const otherValue = cleanItems
      .slice(visibleCount)
      .reduce((sum, item) => sum + item.value, 0);

    slices = [...topSlices, { name: 'Others', value: otherValue }];
  }

  const total = slices.reduce((sum, item) => sum + item.value, 0);

  return slices.map((item, index) => ({
    name: item.name,
    value: item.value,
    percentage: total > 0 ? roundToOneDecimal((item.value / total) * 100) : 0,
    color: colors[index] || DEFAULT_COLOR,
  }));
};
