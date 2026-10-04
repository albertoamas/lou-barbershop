export type IconName =
  | 'home'
  | 'calendar'
  | 'scissors'
  | 'more'
  | 'wallet'
  | 'chart'
  | 'box'
  | 'clock'
  | 'settings'
  | 'logout'
  | 'arrow-right'
  | 'arrow-left'
  | 'check'
  | 'chevron-down'
  | 'close'
  | 'map-pin'
  | 'eye'
  | 'eye-off'
  | 'shield'
  | 'alert'
  | 'plus'
  | 'minus'
  | 'qr'
  | 'cash'
  | 'razor'
  | 'beard'
  | 'eyebrow'
  | 'kid'
  | 'clipper'

interface AppIconProps {
  name: IconName
  size?: number
}

const paths: Record<IconName, React.ReactNode> = {
  home: <path d="M3 10.8 12 3l9 7.8V21h-6v-6H9v6H3Z" />,
  calendar: (
    <>
      <path d="M5 3v3M19 3v3M3 9h18M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Z" />
      <path d="M7 13h3M14 13h3M7 17h3" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="7" r="3" />
      <circle cx="6" cy="17" r="3" />
      <path d="m8.6 8.5 11.4 7M8.6 15.5 20 8.5" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 6h16a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2Z" />
      <path d="M3 7V5a2 2 0 0 1 2-2h12v3M16 11h5v5h-5a2.5 2.5 0 0 1 0-5Z" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  box: (
    <>
      <path d="m12 3 9 4.5v9L12 21l-9-4.5v-9Z" />
      <path d="m3 7.5 9 4.5 9-4.5M12 12v9" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" />
    </>
  ),
  'arrow-right': <path d="M5 12h14M14 7l5 5-5 5" />,
  'arrow-left': <path d="M19 12H5M10 7l-5 5 5 5" />,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  qr: (
    <>
      <path d="M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4Z" />
      <path d="M14 14h2v2h-2ZM18 14h2M14 20h6M20 17v3M17 17v1" />
    </>
  ),
  // Service icons for the public catalog.
  razor: (
    <>
      <path d="M3.5 14.5 14 4a2.1 2.1 0 0 1 3 3L6.5 17.5Z" />
      <path d="m10 14 6.6 6.4a1.6 1.6 0 0 0 2.3-2.2L12.3 11.7" />
    </>
  ),
  beard: (
    <>
      <path d="M5 6v4.5a7 7 0 0 0 14 0V6" />
      <path d="M5 9c2.5 1.5 4.5 1.2 7-.8 2.5 2 4.5 2.3 7 .8" />
      <path d="M9.5 14.5c1.5 1 3.5 1 5 0" />
    </>
  ),
  eyebrow: (
    <>
      <path d="M3.5 9.5c4.5-4 12.5-4 17 0" />
      <path d="M4 15.5c4.5 4 11.5 4 16 0-4.5-4-11.5-4-16 0Z" />
      <circle cx="12" cy="15.5" r="2" />
    </>
  ),
  kid: (
    <>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 5.5c0-2 1.5-3 3-2.5" />
      <path d="M9 15c1.6 1.6 4.4 1.6 6 0" />
      <path d="M9.5 11.5h.01M14.5 11.5h.01" />
    </>
  ),
  clipper: (
    <>
      <rect x="7.5" y="8" width="9" height="13" rx="3" />
      <path d="M7.5 8V5.5h9V8M10 5.5V3M12 5.5V3M14 5.5V3M10 13h4" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5v.01M17.5 14.5v.01" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M3 3l18 18M10.6 6.1A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-2.2 2.9M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3.1-.5M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 20 6v5c0 5-3.2 8.2-8 10-4.8-1.8-8-5-8-10V6Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </>
  ),
}

export const AppIcon = ({ name, size = 22 }: AppIconProps) => (
  <svg
    aria-hidden="true"
    className="shrink-0"
    fill="none"
    height={size}
    viewBox="0 0 24 24"
    width={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.8"
  >
    {paths[name]}
  </svg>
)
