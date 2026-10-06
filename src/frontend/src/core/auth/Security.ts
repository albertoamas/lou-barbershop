// Mirrors the Identity password options configured in the backend
// (Infrastructure/DependencyInjection.cs): at least 12 characters with an uppercase
// letter, a lowercase letter, a digit and a symbol.
export const passwordMinimumLength = 12

export const passwordChecks = (password: string) => [
  {
    id: 'length',
    label: `Al menos ${passwordMinimumLength} caracteres`,
    met: password.length >= passwordMinimumLength,
  },
  { id: 'upper', label: 'Una letra mayúscula', met: /\p{Lu}/u.test(password) },
  { id: 'lower', label: 'Una letra minúscula', met: /\p{Ll}/u.test(password) },
  { id: 'digit', label: 'Un número', met: /[0-9]/.test(password) },
  { id: 'symbol', label: 'Un símbolo, por ejemplo ! o #', met: /[^\p{L}\p{N}]/u.test(password) },
]

export const passwordIsStrong = (password: string) =>
  passwordChecks(password).every((check) => check.met)

// "abcd efgh ijkl": easier to read and type by hand into an authenticator app.
export const groupedKey = (key: string) =>
  key
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/(.{4})(?=.)/g, '$1 ')

// Only real authenticator links are offered as a link.
export const isAuthenticatorUri = (value: string) => value.startsWith('otpauth://totp/')

export const recoveryCodesText = (codes: string[], userName: string, date: string) =>
  [
    'Lou Barbershop: códigos de recuperación',
    `Cuenta: ${userName}`,
    `Generados el: ${date}`,
    '',
    'Cada código sirve una sola vez para entrar si no tienes tu teléfono.',
    '',
    ...codes,
    '',
  ].join('\n')
