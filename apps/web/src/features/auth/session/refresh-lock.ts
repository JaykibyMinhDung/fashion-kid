export const REFRESH_LOCK_NAME = "kids-fashion-auth-refresh";

export type RefreshLockRunner = <T>(operation: () => Promise<T>) => Promise<T>;

type WebLockManager = {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

function browserLockManager(): WebLockManager | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }
  return navigator.locks;
}

export function createRefreshLockRunner(
  lockManager: WebLockManager | undefined = browserLockManager(),
): RefreshLockRunner {
  return async <T>(operation: () => Promise<T>): Promise<T> => {
    if (!lockManager) {
      return operation();
    }
    return lockManager.request(REFRESH_LOCK_NAME, operation);
  };
}

export function runWithRefreshLock<T>(operation: () => Promise<T>): Promise<T> {
  return createRefreshLockRunner()(operation);
}
