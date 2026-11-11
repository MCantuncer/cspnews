import { describe, expect, it } from 'vitest';

import {
  createPasskeyCeremonies,
  parseAuthenticationResponse,
  parseRegistrationResponse,
} from './passkeys.js';

const ceremonies = createPasskeyCeremonies({
  rpId: 'cspnews.example',
  origins: ['https://cspnews.example'],
});

describe('registrationOptions', () => {
  it('asks for a discoverable passkey on our domain, with no attestation', async () => {
    const options = await ceremonies.registrationOptions({
      id: 'acc-1',
      name: 'CSPNews reader',
      existing: [
        { id: 'old-key', publicKey: 'x', counter: 0, transports: ['internal'], backedUp: true },
      ],
    });
    expect(options.rp).toEqual({ name: 'CSPNews', id: 'cspnews.example' });
    expect(options.user.name).toBe('CSPNews reader');
    expect(new TextDecoder().decode(Buffer.from(options.user.id, 'base64url'))).toBe('acc-1');
    expect(options.attestation).toBe('none');
    expect(options.authenticatorSelection?.residentKey).toBe('required');
    expect(options.excludeCredentials).toEqual([
      { id: 'old-key', type: 'public-key', transports: ['internal'] },
    ]);
    expect(options.challenge.length).toBeGreaterThanOrEqual(32);
  });
});

describe('authenticationOptions', () => {
  it('lets the device offer any of its passkeys for our domain', async () => {
    const options = await ceremonies.authenticationOptions();
    expect(options.rpId).toBe('cspnews.example');
    expect(options.allowCredentials ?? []).toEqual([]);
  });
});

describe('verifyRegistration', () => {
  it('refuses an answer that does not check out', async () => {
    const response = parseRegistrationResponse({
      id: 'abc',
      rawId: 'abc',
      type: 'public-key',
      response: { clientDataJSON: 'e30', attestationObject: 'oA' },
      clientExtensionResults: {},
    });
    expect(response).toBeDefined();
    if (!response) return;
    await expect(ceremonies.verifyRegistration(response, 'challenge-challenge')).rejects.toThrow();
  });
});

describe('parsing browser answers', () => {
  const base = { id: 'abc', rawId: 'abc', type: 'public-key', clientExtensionResults: {} };

  it('accepts the shapes browsers send', () => {
    expect(
      parseRegistrationResponse({
        ...base,
        response: { clientDataJSON: 'x', attestationObject: 'y', transports: [] },
      }),
    ).toBeDefined();
    expect(
      parseAuthenticationResponse({
        ...base,
        response: { clientDataJSON: 'x', authenticatorData: 'y', signature: 'z', userHandle: 'u' },
      }),
    ).toBeDefined();
  });

  it('refuses anything else', () => {
    expect(parseRegistrationResponse(undefined)).toBeUndefined();
    expect(parseRegistrationResponse({ ...base, type: 'password', response: {} })).toBeUndefined();
    expect(
      parseAuthenticationResponse({ ...base, response: { clientDataJSON: 'x' } }),
    ).toBeUndefined();
    expect(
      parseAuthenticationResponse({
        ...base,
        response: { clientDataJSON: 'x'.repeat(5000), authenticatorData: 'y', signature: 'z' },
      }),
    ).toBeUndefined();
  });
});
