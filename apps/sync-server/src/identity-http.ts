import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ActorStore } from './actors';
import { issueGuestToken, type IssuedGuestToken } from './guest-token';

interface GuestIdentityResponse extends IssuedGuestToken {
  actorId: string;
}

type GuestTokenIssuer = (actorId: string, secret: string) => Promise<IssuedGuestToken>;

export async function createGuestIdentity(
  actorStore: ActorStore,
  guestTokenSecret: string,
  tokenIssuer: GuestTokenIssuer = issueGuestToken,
): Promise<GuestIdentityResponse> {
  const actorId = await actorStore.createAnonymousActor();
  const credential = await tokenIssuer(actorId, guestTokenSecret);
  return { ...credential, actorId };
}

function writeJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(value));
}

export function createIdentityRequestHandler(actorStore: ActorStore, guestTokenSecret: string) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (pathname !== '/identity/guest') return false;

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      });
      response.end();
      return true;
    }

    if (request.method !== 'POST') {
      writeJson(response, 405, { error: 'method_not_allowed' });
      return true;
    }

    try {
      writeJson(response, 201, await createGuestIdentity(actorStore, guestTokenSecret));
    } catch {
      console.error('[identity] guest actor creation failed');
      writeJson(response, 500, { error: 'identity_creation_failed' });
    }
    return true;
  };
}
