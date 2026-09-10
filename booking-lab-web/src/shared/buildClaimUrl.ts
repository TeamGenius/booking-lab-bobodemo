export function buildClaimUrl(claimToken: string, currentHref?: string) {
  const appUrl = new URL(
    currentHref ??
      (typeof window === 'undefined' ? 'http://localhost:5173/' : window.location.href),
  );
  appUrl.hash = `/gift/${claimToken}`;
  return appUrl.toString();
}