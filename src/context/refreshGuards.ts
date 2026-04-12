export interface RefreshGuardInput {
  blockUi: boolean;
  hasPendingSaveTimeout: boolean;
  isSaveInFlight: boolean;
  isLocalDirty: boolean;
}

export const shouldSkipBackgroundRefresh = ({
  blockUi,
  hasPendingSaveTimeout,
  isSaveInFlight,
  isLocalDirty,
}: RefreshGuardInput): boolean => {
  if (blockUi) {
    return false;
  }

  return hasPendingSaveTimeout || isSaveInFlight || isLocalDirty;
};
