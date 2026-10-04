// Facts and photos of the public site in one place (plan section 3.3): the shop changes
// them here, or drops files in public/media/, without touching any layout.

export interface SitePhoto {
  // Path under public/, for example "/media/local.webp".
  src: string
  alt: string
  width: number
  height: number
}

const optional = (value: string | undefined) => (value?.trim() ? value.trim() : undefined)

export const publicSite = {
  city: 'Tarija',
  // Street address shown under "Horario y ubicación"; pending from the shop.
  address: undefined as string | undefined,
  mapsUrl: 'https://maps.app.goo.gl/WCoCT4uU7mwGRCxA8',
  mapEmbedUrl: 'https://www.google.com/maps?q=-21.5355119,-64.7304746&z=17&output=embed',
  whatsappUrl: optional(import.meta.env.VITE_SOCIAL_WHATSAPP_URL),
  photos: {
    // Beside the welcome block on larger screens; the logo stands in until it exists.
    shop: undefined as SitePhoto | undefined,
    // Recent work. The gallery section stays hidden while this is empty.
    gallery: [] as SitePhoto[],
    // Barber photos by display name; initials are shown without one.
    barbers: {} as Record<string, SitePhoto>,
  },
}
