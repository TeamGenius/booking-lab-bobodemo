export type DemoClaimPayload = {
  version: 1;
  bookingId: string;
  siteId: string;
  serviceId: string;
};

type GiftClaimSource = {
  id: string;
  selections: {
    siteId: string | null;
    serviceId: string | null;
  };
};

export function createDemoClaimPayload(source: GiftClaimSource): DemoClaimPayload | null {
  const { siteId, serviceId } = source.selections;
  if (!siteId || !serviceId) return null;

  return {
    version: 1,
    bookingId: source.id,
    siteId,
    serviceId,
  };
}

export function encodeDemoClaimPayload(payload: DemoClaimPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodeDemoClaimPayload(
  encoded: string | null,
  bookingId: string,
): DemoClaimPayload | null {
  if (!encoded) return null;

  try {
    const base64 = encoded.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;

    if (!parsed || typeof parsed !== 'object') return null;
    const payload = parsed as Partial<DemoClaimPayload>;
    if (
      payload.version !== 1 ||
      payload.bookingId !== bookingId ||
      typeof payload.siteId !== 'string' ||
      typeof payload.serviceId !== 'string'
    ) {
      return null;
    }

    return payload as DemoClaimPayload;
  } catch {
    return null;
  }
}