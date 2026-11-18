// pino redaction paths (docs/ARCHITECTURE.md section 4.5). Request and response
// bodies and headers are never logged in the first place; these paths are the
// second line of defence for anything else that reaches a log. `*.key` covers the
// key one level down in any object; the top-level key is listed separately.

const SENSITIVE_KEYS = [
  'password',
  'code',
  'accessToken',
  'refreshToken',
  'tokens',
  'mfaToken',
  'otpauth',
  'secret',
  'name',
  'email',
  'phone',
  'to',
  'phone_e164',
] as const;

export const REDACT_PATHS: readonly string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-feengo-forwarding-key"]',
  'res.headers["set-cookie"]',
  ...SENSITIVE_KEYS.map((key) => `*.${key}`),
  ...SENSITIVE_KEYS,
];

export const REDACTED = '[Redacted]';
