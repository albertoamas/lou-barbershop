import { siFacebook, siInstagram, siTiktok, siWhatsapp } from 'simple-icons'

interface SocialNetwork {
  label: string
  path: string
  url?: string
}

const networks: SocialNetwork[] = [
  { label: 'Facebook', path: siFacebook.path, url: import.meta.env.VITE_SOCIAL_FACEBOOK_URL },
  { label: 'WhatsApp', path: siWhatsapp.path, url: import.meta.env.VITE_SOCIAL_WHATSAPP_URL },
  { label: 'Instagram', path: siInstagram.path, url: import.meta.env.VITE_SOCIAL_INSTAGRAM_URL },
  { label: 'TikTok', path: siTiktok.path, url: import.meta.env.VITE_SOCIAL_TIKTOK_URL },
]

const SocialIcon = ({ path }: { path: string }) => (
  <svg aria-hidden="true" className="size-5" fill="currentColor" viewBox="0 0 24 24">
    <path d={path} />
  </svg>
)

export const SocialLinks = () => (
  <div className="mt-5 flex flex-wrap gap-2" aria-label="Redes sociales de Lou Barbershop">
    {networks.map((network) =>
      network.url ? (
        <a
          key={network.label}
          className="grid size-11 place-items-center rounded-control border border-surface-strong bg-canvas text-ink transition-colors duration-150 hover:bg-ink hover:text-on-ink"
          href={network.url}
          target="_blank"
          rel="noreferrer"
          aria-label={network.label}
        >
          <SocialIcon path={network.path} />
        </a>
      ) : (
        <span
          key={network.label}
          className="grid size-11 place-items-center rounded-control border border-surface-strong bg-canvas text-ink-muted"
          role="img"
          aria-label={`${network.label}; enlace pendiente de configuración`}
          title={`${network.label}: falta configurar el enlace oficial`}
        >
          <SocialIcon path={network.path} />
        </span>
      ),
    )}
  </div>
)
