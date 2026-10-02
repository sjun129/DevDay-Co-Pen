import type { ParticipantKind } from '@co-pen/shared';
import { DEFAULT_AGENT_ACTOR_ID } from './actors';
import { verifyGuestToken } from './guest-token';

export interface ConnectionContext {
  kind: ParticipantKind;
  actorId: string;
  credentialVersion: 1;
}

export interface AuthenticationConfig {
  agentSharedSecret: string;
  guestTokenSecret: string;
}

export async function authenticateConnection(
  token: string,
  config: AuthenticationConfig,
): Promise<ConnectionContext> {
  if (token && token === config.agentSharedSecret) {
    return {
      kind: 'agent',
      actorId: DEFAULT_AGENT_ACTOR_ID,
      credentialVersion: 1,
    };
  }

  const identity = await verifyGuestToken(token, config.guestTokenSecret);
  return {
    kind: 'human',
    actorId: identity.actorId,
    credentialVersion: identity.credentialVersion,
  };
}
