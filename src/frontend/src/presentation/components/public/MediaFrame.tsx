import type { SitePhoto } from '../../content/publicSite'
import { cn } from '../../styles/cn'

interface MediaFrameProps {
  photo?: SitePhoto | undefined
  // CSS aspect ratio, fixed so the layout never shifts when the photo arrives.
  ratio?: string
  className?: string
}

// Space for a real photo (plan section 3.3). Until it exists it shows a dignified
// brand frame: ink with soft barber-pole lines and the logo mark, never a stock image.
export const MediaFrame = ({ photo, ratio = '1 / 1', className }: MediaFrameProps) =>
  photo ? (
    <img
      className={cn('w-full rounded-panel object-cover', className)}
      style={{ aspectRatio: ratio }}
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <div
      aria-hidden="true"
      className={cn(
        'relative grid place-items-center overflow-hidden rounded-panel bg-ink',
        className,
      )}
      style={{
        aspectRatio: ratio,
        backgroundImage:
          'repeating-linear-gradient(-45deg, rgb(255 255 255 / 0.06) 0 10px, transparent 10px 20px)',
      }}
    >
      <img
        className="w-1/4 max-w-24 rounded-control opacity-80"
        src="/icons/icon-192.png"
        alt=""
        width={192}
        height={192}
        loading="lazy"
      />
    </div>
  )
