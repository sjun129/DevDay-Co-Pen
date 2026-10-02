import { SignJWT, jwtVerify } from 'jose';

export const GUEST_TOKEN_ISSUER = 'co-pen-sync';
export const GUEST_TOKEN_AUDIENCE = 'co-pen-guest';
export const GUEST_TOKEN_VERSION = 1;
export const GUEST_TOKEN_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface GuestTokenIdentity {
  actorId: string;
  credentialVersion: 1;
}

export interface IssuedGuestToken {
  token: string;
  expiresAt: string;
}

interface IssueGuestTokenOptions {
  now?: Date;
  expiresInSeconds?: number;
}

function signingKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function issueGuestToken(
  actorId: string,
  secret: string,
  options: IssueGuestTokenOptions = {},
): Promise<IssuedGuestToken> {
  if (!UUID_PATTERN.test(actorId)) throw new Error('invalid_actor_id');

  const issuedAt = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const expiresAt = issuedAt + (options.expiresInSeconds ?? GUEST_TOKEN_LIFETIME_SECONDS);
  const token = await new SignJWT({ kind: 'anonymous', ver: GUEST_TOKEN_VERSION })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(GUEST_TOKEN_ISSUER)
    .setAudience(GUEST_TOKEN_AUDIENCE)
    .setSubject(actorId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(signingKey(secret));

  return { token, expiresAt: new Date(expiresAt * 1000).toISOString() };
}

export async function verifyGuestToken(
  token: string,
  secret: string,
  currentDate?: Date,
): Promise<GuestTokenIdentity> {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, signingKey(secret), {
      algorithms: ['HS256'],
      issuer: GUEST_TOKEN_ISSUER,
      audience: GUEST_TOKEN_AUDIENCE,
      currentDate,
    });

    if (protectedHeader.typ !== 'JWT') throw new Error('invalid_type');
    if (payload.kind !== 'anonymous' || payload.ver !== GUEST_TOKEN_VERSION) {
      throw new Error('invalid_claims');
    }
    if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)) {
      throw new Error('invalid_timestamps');
    }
    if (typeof payload.sub !== 'string' || !UUID_PATTERN.test(payload.sub)) {
      throw new Error('invalid_subject');
    }

    return { actorId: payload.sub, credentialVersion: GUEST_TOKEN_VERSION };
  } catch {
    throw new Error('invalid_guest_token');
  }
}
