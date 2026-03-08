export interface RefreshGuardInput {
  blockUi: boolean;
  hasPendingSaveTimeout: boolean;
  isSaveInFlight: boolean;
}

export const shouldSkipBackgroundRefresh = ({
  blockUi,
  hasPendingSaveTimeout,
  isSaveInFlight,
}: RefreshGuardInput): boolean => {
  if (blockUi) {
    return false;
  }

  return hasPendingSaveTimeout || isSaveInFlight;
};
