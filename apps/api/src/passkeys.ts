/**
 * Passkeys, through WebAuthn. The browser asks the reader's device to make or use a passkey; we
 * hand out the challenge and check the answer. The library does the cryptography.
 *
 * Accounts made with a passkey hold no email or password at all: the reader's device proves who
 * they are with face, fingerprint or device PIN.
 */
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { z } from 'zod';

/** A passkey as we store it. */
export interface StoredPasskey {
  readonly id: string;
  readonly publicKey: string;
  readonly counter: number;
  readonly transports: readonly string[];
  readonly backedUp: boolean;
}

/** The parts of WebAuthn that check a device's answers, so tests can stand in a fake. */
export interface PasskeyCeremonies {
  registrationOptions(account: {
    id: string;
    name: string;
    existing: readonly StoredPasskey[];
  }): Promise<PublicKeyCredentialCreationOptionsJSON>;
  /** Checks a new passkey. Throws when it doesn't check out. */
  verifyRegistration(response: RegistrationResponseJSON, challenge: string): Promise<StoredPasskey>;
  authenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON>;
  /** Checks a sign-in with a stored passkey. Returns the new signature counter, or throws. */
  verifyAuthentication(
    response: AuthenticationResponseJSON,
    challenge: string,
    passkey: StoredPasskey,
  ): Promise<number>;
}

export interface PasskeyConfig {
  /** The site's domain, such as example.com, or localhost in local dev. */
  readonly rpId: string;
  /** The site's pages, where the browser runs the ceremony. */
  readonly origins: readonly string[];
}

const RP_NAME = 'CSPNews';

export function createPasskeyCeremonies(config: PasskeyConfig): PasskeyCeremonies {
  const expected = { expectedOrigin: [...config.origins], expectedRPID: config.rpId };
  return {
    registrationOptions: (account) =>
      generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: config.rpId,
        userID: new TextEncoder().encode(account.id),
        userName: account.name,
        userDisplayName: account.name,
        attestationType: 'none',
        // A discoverable passkey: the reader signs in without typing anything.
        authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
        excludeCredentials: account.existing.map((p) => ({
          id: p.id,
          transports: [...p.transports],
        })),
      }),

    async verifyRegistration(response, challenge) {
      const result = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        ...expected,
        requireUserVerification: false,
      });
      if (!result.verified) throw new PasskeyError('The passkey could not be checked.');
      const { credential, credentialBackedUp } = result.registrationInfo;
      return {
        id: credential.id,
        publicKey: isoBase64URL.fromBuffer(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports ?? [],
        backedUp: credentialBackedUp,
      };
    },

    authenticationOptions: () =>
      generateAuthenticationOptions({ rpID: config.rpId, userVerification: 'preferred' }),

    async verifyAuthentication(response, challenge, passkey) {
      const result = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        ...expected,
        requireUserVerification: false,
        credential: {
          id: passkey.id,
          publicKey: isoBase64URL.toBuffer(passkey.publicKey),
          counter: passkey.counter,
          transports: [...passkey.transports],
        },
      });
      if (!result.verified) throw new PasskeyError('The passkey could not be checked.');
      return result.authenticationInfo.newCounter;
    },
  };
}

export class PasskeyError extends Error {
  override readonly name = 'PasskeyError';
}

/**
 * The outer shape of a browser's WebAuthn answer. The library checks everything inside it; this
 * only keeps oversized or malformed bodies out.
 */
const CredentialSchema = z.looseObject({
  id: z.string().min(1).max(1024),
  rawId: z.string().min(1).max(1024),
  type: z.literal('public-key'),
  response: z.looseObject({ clientDataJSON: z.string().max(4096) }),
  clientExtensionResults: z.record(z.string(), z.unknown()),
});

export function parseRegistrationResponse(body: unknown): RegistrationResponseJSON | undefined {
  const parsed = CredentialSchema.extend({
    response: z.looseObject({
      clientDataJSON: z.string().max(4096),
      attestationObject: z.string().max(16384),
    }),
  }).safeParse(body);
  return parsed.success ? parsed.data : undefined;
}

export function parseAuthenticationResponse(body: unknown): AuthenticationResponseJSON | undefined {
  const parsed = CredentialSchema.extend({
    response: z.looseObject({
      clientDataJSON: z.string().max(4096),
      authenticatorData: z.string().max(4096),
      signature: z.string().max(1024),
    }),
  }).safeParse(body);
  return parsed.success ? parsed.data : undefined;
}
