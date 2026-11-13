import { describe, expect, test } from 'vitest';
import { Email } from './email';
import { InvalidEmailError } from '@accounts/domain/errors/invalid-email-error';

describe('Email Value Object', () => {
  describe('Valid emails', () => {
    test('should create a valid email', () => {
      const email = Email.create('user@example.com');

      expect(email.value).toBe('user@example.com');
    });

    test('should normalize email to lowercase', () => {
      const email = Email.create('User@Example.COM');

      expect(email.value).toBe('user@example.com');
    });

    test('should trim whitespace', () => {
      const email = Email.create('  user@example.com  ');

      expect(email.value).toBe('user@example.com');
    });

    test('should accept email with special characters in local part', () => {
      const email = Email.create('user.name+tag@example.com');

      expect(email.value).toBe('user.name+tag@example.com');
    });

    test('should accept email with dots in local part', () => {
      const email = Email.create('first.last@example.com');

      expect(email.value).toBe('first.last@example.com');
    });

    test('should accept email with subdomain', () => {
      const email = Email.create('user@mail.example.com');

      expect(email.value).toBe('user@mail.example.com');
    });

    test('should accept email with hyphen in domain', () => {
      const email = Email.create('user@my-domain.com');

      expect(email.value).toBe('user@my-domain.com');
    });

    test('should accept email with numbers', () => {
      const email = Email.create('user123@example456.com');

      expect(email.value).toBe('user123@example456.com');
    });
  });

  describe('Invalid emails', () => {
    test('should reject empty string', () => {
      expect(() => Email.create('')).toThrow(InvalidEmailError);
      expect(() => Email.create('')).toThrow('Email is required.');
    });

    test('should reject whitespace only', () => {
      expect(() => Email.create('   ')).toThrow(InvalidEmailError);
      expect(() => Email.create('   ')).toThrow('Email is required.');
    });

    test('should reject null', () => {
      expect(() => Email.create(null as any)).toThrow(InvalidEmailError);
      expect(() => Email.create(null as any)).toThrow('Email is required.');
    });

    test('should reject undefined', () => {
      expect(() => Email.create(undefined as any)).toThrow(InvalidEmailError);
      expect(() => Email.create(undefined as any)).toThrow('Email is required.');
    });

    test('should reject non-string value', () => {
      expect(() => Email.create(123 as any)).toThrow(InvalidEmailError);
      expect(() => Email.create(123 as any)).toThrow('Email is required.');
    });

    test('should reject email without @', () => {
      expect(() => Email.create('userexample.com')).toThrow(InvalidEmailError);
      expect(() => Email.create('userexample.com')).toThrow('Invalid email format.');
    });

    test('should reject email without domain', () => {
      expect(() => Email.create('user@')).toThrow(InvalidEmailError);
      expect(() => Email.create('user@')).toThrow('Invalid email format.');
    });

    test('should reject email without local part', () => {
      expect(() => Email.create('@example.com')).toThrow(InvalidEmailError);
      expect(() => Email.create('@example.com')).toThrow('Invalid email format.');
    });

    test('should reject email without TLD', () => {
      expect(() => Email.create('user@example')).toThrow(InvalidEmailError);
      expect(() => Email.create('user@example')).toThrow('Invalid email format.');
    });

    test('should reject email with double dots in local part', () => {
      expect(() => Email.create('user..name@example.com')).toThrow(InvalidEmailError);
      expect(() => Email.create('user..name@example.com')).toThrow(
        'Invalid email format.',
      );
    });

    test('should reject email starting with dot', () => {
      expect(() => Email.create('.user@example.com')).toThrow(InvalidEmailError);
      expect(() => Email.create('.user@example.com')).toThrow('Invalid email format.');
    });

    test('should reject email ending with dot before @', () => {
      expect(() => Email.create('user.@example.com')).toThrow(InvalidEmailError);
      expect(() => Email.create('user.@example.com')).toThrow('Invalid email format.');
    });

    test('should reject email with spaces', () => {
      expect(() => Email.create('user name@example.com')).toThrow(InvalidEmailError);
      expect(() => Email.create('user name@example.com')).toThrow(
        'Invalid email format.',
      );
    });

    test('should reject email exceeding 254 characters', () => {
      const localPart = 'a'.repeat(245); // 245 + @ + example.com (11) = 257

      expect(() => Email.create(`${localPart}@example.com`)).toThrow(InvalidEmailError);
      expect(() => Email.create(`${localPart}@example.com`)).toThrow(
        'Email exceeds 254 characters.',
      );
    });

    test('should accept email with exactly 254 characters', () => {
      const localPart = 'a'.repeat(242); // 242 + @ + example.com (11) = 254
      const email = Email.create(`${localPart}@example.com`);

      expect(email.value).toHaveLength(254);
    });
  });

  describe('Value Object behavior', () => {
    test('should expose value through getter', () => {
      const email = Email.create('user@example.com');

      expect(email.value).toBe('user@example.com');
    });

    test('should compare emails using equals method', () => {
      const email1 = Email.create('user@example.com');
      const email2 = Email.create('user@example.com');
      const email3 = Email.create('other@example.com');

      expect(email1.equals(email2)).toBe(true);
      expect(email1.equals(email3)).toBe(false);
    });

    test('should compare normalized emails', () => {
      const email1 = Email.create('User@Example.COM');
      const email2 = Email.create('user@example.com');

      expect(email1.equals(email2)).toBe(true);
    });
  });
});
