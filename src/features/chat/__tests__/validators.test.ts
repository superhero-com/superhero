// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  isValidPubkey, isValidNpub, isValidNsec, isValidRelayUrl, isValidMessageContent,
  sanitizeMessageContent,
} from '../utils/validators';

const PUB = 'e8bcf3823669444d0b49ad45d65088635d9fd8500a75b5f20b59abefa56a144f';
const NPUB = 'npub1az708q3kd9zy6z6f44zav5ygvdwelkzspf6mtusttx47lft2z38sghk0w7';

describe('validators', () => {
  it('validates hex pubkeys', () => {
    expect(isValidPubkey(PUB)).toBe(true);
    expect(isValidPubkey('xyz')).toBe(false);
    expect(isValidPubkey(`${PUB}00`)).toBe(false);
  });

  it('validates npub / nsec bech32', () => {
    expect(isValidNpub(NPUB)).toBe(true);
    expect(isValidNpub('npub1invalid')).toBe(false);
    expect(isValidNsec('nsec1tu567wukwcvq9y880f8045n9cnp07299xqjxrae4jl76y6aj2ucs2mkupq')).toBe(true);
    expect(isValidNsec(NPUB)).toBe(false);
  });

  it('validates relay URLs (ws/wss only)', () => {
    expect(isValidRelayUrl('wss://relay.example.com')).toBe(true);
    expect(isValidRelayUrl('ws://localhost:8080')).toBe(true);
    expect(isValidRelayUrl('https://relay.example.com')).toBe(false);
    expect(isValidRelayUrl('garbage')).toBe(false);
  });

  it('validates and sanitizes message content', () => {
    expect(isValidMessageContent('  hi ')).toBe(true);
    expect(isValidMessageContent('   ')).toBe(false);
    expect(sanitizeMessageContent('  a   b  ')).toBe('a b');
  });
});
