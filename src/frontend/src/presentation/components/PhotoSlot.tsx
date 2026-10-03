import { cn } from '../styles/cn'
import { Stripes } from './Stripes'

interface PhotoSlotProps {
  // Describes the photo for screen readers once it exists, and labels the empty slot.
  alt: string
  src?: string | undefined
  // CSS aspect ratio such as "4 / 3" or "1 / 1"; fixed so the layout never shifts.
  ratio?: string
  priority?: boolean
  className?: string
}

// Reserved space for a barbershop photo (plan section 3.3). Until a photo exists it
// shows a dignified brand fill instead of a stock image or a broken-image icon.
export const PhotoSlot = ({
  alt,
  src,
  ratio = '4 / 3',
  priority = false,
  className,
}: PhotoSlotProps) => (
  <div
    className={cn('relative overflow-hidden rounded-panel bg-surface-muted', className)}
    style={{ aspectRatio: ratio }}
  >
    {src ? (
      <img
        className="size-full object-cover"
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    ) : (
      <>
        <Stripes tone="soft" className="absolute inset-0" />
        <span className="absolute bottom-3 left-3 rounded-full bg-surface px-3 py-1 text-sm text-ink-soft">
          {alt}
        </span>
      </>
    )}
  </div>
)
