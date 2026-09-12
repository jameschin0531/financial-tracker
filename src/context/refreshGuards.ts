export interface RefreshGuardInput {
  blockUi: boolean;
  hasPendingSaveTimeout: boolean;
  isSaveInFlight: boolean;
  isLocalDirty: boolean;
}

export const shouldSkipBackgroundRefresh = ({
  hasPendingSaveTimeout,
  isSaveInFlight,
  isLocalDirty,
}: RefreshGuardInput): boolean => {
  // `blockUi` deliberately does not grant a bypass: a blocking initial load may
  // run while a cached dirty snapshot is still waiting to be pushed, and the
  // server copy would overwrite it.
  return hasPendingSaveTimeout || isSaveInFlight || isLocalDirty;
};
