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
  | 'close'
  | 'map-pin'

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
  close: <path d="m6 6 12 12M18 6 6 18" />,
  'map-pin': (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
}

export const AppIcon = ({ name, size = 22 }: AppIconProps) => (
  <svg
    aria-hidden="true"
    className="app-icon"
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
