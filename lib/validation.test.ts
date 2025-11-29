import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sanitizeString, sanitizeObject } from './validation';

describe('Input Sanitization Property Tests', () => {
  /**
   * Feature: drivesphere-marketplace, Property 32: Input sanitization
   * Validates: Requirements 13.2
   * 
   * For any user input received through forms or API requests, the system should
   * validate and sanitize the input to remove potentially malicious content before processing.
   */
  it('Property 32: Input sanitization - script tags are removed', async () => {
    await fc.assert(
      fc.property(
        fc.string(), // arbitrary string content
        fc.string(), // arbitrary script content
        (content, scriptContent) => {
          // Create input with script tag
          const maliciousInput = `${content}<script>${scriptContent}</script>`;
          
          // Sanitize the input
          const sanitized = sanitizeString(maliciousInput);
          
          // Verify script tags are removed
          expect(sanitized).not.toContain('<script>');
          expect(sanitized).not.toContain('</script>');
          expect(sanitized.toLowerCase()).not.toMatch(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32: Input sanitization - iframe tags are removed', async () => {
    await fc.assert(
      fc.property(
        fc.string(), // arbitrary string content
        fc.string(), // arbitrary iframe content
        (content, iframeContent) => {
          // Create input with iframe tag
          const maliciousInput = `${content}<iframe>${iframeContent}</iframe>`;
          
          // Sanitize the input
          const sanitized = sanitizeString(maliciousInput);
          
          // Verify iframe tags are removed
          expect(sanitized).not.toContain('<iframe>');
          expect(sanitized).not.toContain('</iframe>');
          expect(sanitized.toLowerCase()).not.toMatch(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32: Input sanitization - javascript protocol is removed', async () => {
    await fc.assert(
      fc.property(
        fc.string(), // arbitrary string content
        fc.string(), // arbitrary javascript code
        (content, jsCode) => {
          // Create input with javascript: protocol
          const maliciousInput = `${content}javascript:${jsCode}`;
          
          // Sanitize the input
          const sanitized = sanitizeString(maliciousInput);
          
          // Verify javascript: protocol is removed
          expect(sanitized.toLowerCase()).not.toContain('javascript:');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32: Input sanitization - event handlers are removed', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom('onclick', 'onload', 'onerror', 'onmouseover', 'onfocus'),
        fc.string(), // arbitrary event handler code
        (eventName, handlerCode) => {
          // Create input with event handler
          const maliciousInput = `<div ${eventName}="${handlerCode}">content</div>`;
          
          // Sanitize the input
          const sanitized = sanitizeString(maliciousInput);
          
          // Verify event handlers are removed
          expect(sanitized.toLowerCase()).not.toMatch(/on\w+\s*=/gi);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32: Input sanitization - whitespace is trimmed', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // non-empty string
        fc.integer({ min: 1, max: 10 }), // number of leading spaces
        fc.integer({ min: 1, max: 10 }), // number of trailing spaces
        (content, leadingSpaces, trailingSpaces) => {
          // Create input with leading and trailing whitespace
          const inputWithWhitespace = ' '.repeat(leadingSpaces) + content + ' '.repeat(trailingSpaces);
          
          // Sanitize the input
          const sanitized = sanitizeString(inputWithWhitespace);
          
          // Verify whitespace is trimmed
          expect(sanitized).toBe(sanitized.trim());
          
          // If content is not all whitespace, sanitized should not start or end with space
          if (content.trim().length > 0) {
            expect(sanitized).not.toMatch(/^\s/);
            expect(sanitized).not.toMatch(/\s$/);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32: Input sanitization - objects with string values are sanitized', async () => {
    await fc.assert(
      fc.property(
        fc.string(), // field1 value
        fc.string(), // field2 value
        fc.string(), // malicious script
        (value1, value2, script) => {
          // Create object with potentially malicious strings
          const maliciousObject = {
            field1: `${value1}<script>${script}</script>`,
            field2: `${value2}javascript:alert('xss')`,
            field3: 123, // non-string value
          };
          
          // Sanitize the object
          const sanitized = sanitizeObject(maliciousObject);
          
          // Verify string fields are sanitized
          expect(sanitized.field1).not.toContain('<script>');
          expect(sanitized.field1).not.toContain('</script>');
          expect(sanitized.field2.toLowerCase()).not.toContain('javascript:');
          
          // Verify non-string fields are unchanged
          expect(sanitized.field3).toBe(123);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32: Input sanitization - safe content is preserved', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => {
          // Filter out strings that contain malicious patterns
          const lower = s.toLowerCase();
          return !lower.includes('<script') &&
                 !lower.includes('<iframe') &&
                 !lower.includes('javascript:') &&
                 !/on\w+\s*=/i.test(s);
        }),
        (safeContent) => {
          // Sanitize safe content
          const sanitized = sanitizeString(safeContent);
          
          // Verify safe content is preserved (after trimming)
          expect(sanitized).toBe(safeContent.trim());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32: Input sanitization - multiple malicious patterns are all removed', async () => {
    await fc.assert(
      fc.property(
        fc.string(), // content
        fc.string(), // script content
        fc.string(), // iframe content
        fc.string(), // js code
        (content, scriptContent, iframeContent, jsCode) => {
          // Create input with multiple malicious patterns
          const maliciousInput = `
            ${content}
            <script>${scriptContent}</script>
            <iframe>${iframeContent}</iframe>
            <a href="javascript:${jsCode}">link</a>
            <div onclick="alert('xss')">click me</div>
          `;
          
          // Sanitize the input
          const sanitized = sanitizeString(maliciousInput);
          
          // Verify all malicious patterns are removed
          expect(sanitized).not.toContain('<script>');
          expect(sanitized).not.toContain('</script>');
          expect(sanitized).not.toContain('<iframe>');
          expect(sanitized).not.toContain('</iframe>');
          expect(sanitized.toLowerCase()).not.toContain('javascript:');
          expect(sanitized.toLowerCase()).not.toMatch(/on\w+\s*=/gi);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32: Input sanitization - empty and whitespace-only strings are handled', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom('', '   ', '\t\t', '\n\n', '  \t\n  '),
        (whitespaceString) => {
          // Sanitize whitespace-only string
          const sanitized = sanitizeString(whitespaceString);
          
          // Verify result is empty string
          expect(sanitized).toBe('');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 32: Input sanitization - case-insensitive pattern matching', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom('SCRIPT', 'Script', 'sCrIpT', 'IFRAME', 'IFrame', 'iFrAmE'),
        fc.constantFrom('JAVASCRIPT', 'JavaScript', 'jAvAsCrIpT'),
        fc.string(),
        (tagName, protocol, content) => {
          // Create input with mixed-case malicious patterns
          const maliciousInput = `<${tagName}>${content}</${tagName}> ${protocol}:alert('xss')`;
          
          // Sanitize the input
          const sanitized = sanitizeString(maliciousInput);
          
          // Verify patterns are removed regardless of case
          expect(sanitized.toLowerCase()).not.toContain('<script');
          expect(sanitized.toLowerCase()).not.toContain('<iframe');
          expect(sanitized.toLowerCase()).not.toContain('javascript:');
        }
      ),
      { numRuns: 100 }
    );
  });
});
