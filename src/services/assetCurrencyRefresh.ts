import type { Asset } from '../types/financial';

export interface AssetRefreshUpdate {
  id: string;
  asset: Partial<Asset>;
}

export const buildUsdAssetRefreshUpdates = (
  assets: Asset[],
  usdToMyrRate: number,
): AssetRefreshUpdate[] => {
  if (!Number.isFinite(usdToMyrRate) || usdToMyrRate <= 0) {
    return [];
  }

  return assets
    .filter((asset) => asset.currency === 'USD')
    .map((asset) => ({
      id: asset.id,
      asset: {
        exchangeRate: usdToMyrRate,
      },
    }));
};
