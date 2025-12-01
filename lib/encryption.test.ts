import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { encrypt, decrypt } from './encryption';

// Feature: drivesphere-marketplace, Property 33: Sensitive data encryption
describe('Property 33: Sensitive data encryption', () => {
  beforeAll(() => {
    // Set encryption key for testing
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = 'test-encryption-key-at-least-32-characters-long-for-testing';
    }
  });

  it('should encrypt and decrypt any string to return the original value', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        (originalText) => {
          const encrypted = encrypt(originalText);
          const decrypted = decrypt(encrypted);
          
          // The decrypted value should match the original
          expect(decrypted).toBe(originalText);
          
          // The encrypted value should be different from the original
          expect(encrypted).not.toBe(originalText);
          
          // The encrypted value should be base64 encoded
          expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce different encrypted values for the same input (due to random IV and salt)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (text) => {
          const encrypted1 = encrypt(text);
          const encrypted2 = encrypt(text);
          
          // Different encrypted values
          expect(encrypted1).not.toBe(encrypted2);
          
          // But both decrypt to the same original value
          expect(decrypt(encrypted1)).toBe(text);
          expect(decrypt(encrypted2)).toBe(text);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle sensitive document numbers (Aadhaar and PAN formats)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Aadhaar format: 12 digits
          fc.tuple(fc.integer({ min: 100000000000, max: 999999999999 })).map(([n]) => n.toString()),
          // PAN format: 5 letters, 4 digits, 1 letter
          fc.tuple(
            fc.stringOf(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'), { minLength: 5, maxLength: 5 }),
            fc.integer({ min: 1000, max: 9999 }),
            fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F')
          ).map(([letters, digits, lastLetter]) => `${letters}${digits}${lastLetter}`)
        ),
        (documentNumber) => {
          const encrypted = encrypt(documentNumber);
          const decrypted = decrypt(encrypted);
          
          expect(decrypted).toBe(documentNumber);
          expect(encrypted).not.toContain(documentNumber);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should throw error when trying to decrypt invalid data', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (invalidData) => {
          // Skip if the random string happens to be valid base64 with correct structure
          try {
            const buffer = Buffer.from(invalidData, 'base64');
            if (buffer.length < 96) { // Minimum size for salt + iv + tag
              expect(() => decrypt(invalidData)).toThrow();
            }
          } catch {
            expect(() => decrypt(invalidData)).toThrow();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
