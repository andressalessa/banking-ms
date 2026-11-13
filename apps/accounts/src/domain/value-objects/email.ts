import { ValueObject } from '@core/entities/value-object';
import { InvalidEmailError } from '@accounts/domain/errors/invalid-email-error';

// RFC 5321/5322 Email Regex (simplified but compliant, requires TLD)
// Validates normalized lowercase emails with proper dot-atom rules
const EMAIL_REGEX = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: EmailProps) {
    super(props);
  }

  public static create(value: string): Email {
    if (!value || typeof value !== 'string') {
      throw new InvalidEmailError('Email is required.');
    }

    const normalized = value.trim().toLowerCase();

    if (normalized.length === 0) {
      throw new InvalidEmailError('Email is required.');
    }

    // RFC 5321: max 254 characters for email address
    if (normalized.length > 254) {
      throw new InvalidEmailError('Email exceeds 254 characters.');
    }

    if (!EMAIL_REGEX.test(normalized)) {
      throw new InvalidEmailError('Invalid email format.');
    }

    return new Email({ value: normalized });
  }
}
