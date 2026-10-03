import type { ParticipantKind } from '@co-pen/shared';
import { DEFAULT_AGENT_ACTOR_ID, type ActorStore } from './actors';
import { verifyGuestToken, type GuestTokenIdentity } from './guest-token';

export interface ConnectionContext {
  kind: ParticipantKind;
  actorId: string;
  credentialVersion: 1;
}

export interface AuthenticationConfig {
  agentSharedSecret: string;
  guestTokenSecret: string;
}

export type GuestAuthenticationErrorCode =
  | 'invalid_guest_token'
  | 'identity_validation_unavailable';

export class GuestAuthenticationError extends Error {
  constructor(readonly code: GuestAuthenticationErrorCode) {
    super(code);
  }
}

export async function authenticateGuestCredential(
  token: string,
  guestTokenSecret: string,
  actorStore: ActorStore,
): Promise<GuestTokenIdentity> {
  let identity: GuestTokenIdentity;
  try {
    identity = await verifyGuestToken(token, guestTokenSecret);
  } catch {
    throw new GuestAuthenticationError('invalid_guest_token');
  }

  let exists: boolean;
  try {
    exists = await actorStore.anonymousActorExists(identity.actorId);
  } catch {
    throw new GuestAuthenticationError('identity_validation_unavailable');
  }
  if (!exists) throw new GuestAuthenticationError('invalid_guest_token');
  return identity;
}

export async function authenticateConnection(
  token: string,
  config: AuthenticationConfig,
  actorStore: ActorStore,
): Promise<ConnectionContext> {
  if (token && token === config.agentSharedSecret) {
    return {
      kind: 'agent',
      actorId: DEFAULT_AGENT_ACTOR_ID,
      credentialVersion: 1,
    };
  }

  const identity = await authenticateGuestCredential(token, config.guestTokenSecret, actorStore);
  return {
    kind: 'human',
    actorId: identity.actorId,
    credentialVersion: identity.credentialVersion,
  };
}
