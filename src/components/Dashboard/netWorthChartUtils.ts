export const getNetWorthYAxisDomain = (values: number[]): [number, number] => {
  if (values.length === 0) {
    return [0, 0];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const padding = range > 0 ? range * 0.08 : Math.max(Math.abs(min) * 0.05, 1000);

  return [min - padding, max + padding];
};
