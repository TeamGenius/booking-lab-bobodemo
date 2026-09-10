import { encodeDemoClaimPayload, type DemoClaimPayload } from './demoClaimPayload';

export function buildClaimUrl(
  claimToken: string,
  currentHref?: string,
  demoPayload?: DemoClaimPayload,
) {
  const appUrl = new URL(
    currentHref ??
      (typeof window === 'undefined' ? 'http://localhost:5173/' : window.location.href),
  );
  const route = `/gift/${claimToken}`;
  appUrl.hash = demoPayload
    ? `${route}?demo=${encodeDemoClaimPayload(demoPayload)}`
    : route;
  return appUrl.toString();
}