// Up to two initials from the words of a display name ("Pablo Suárez" -> "PS").
export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toLocaleUpperCase('es'))
    .join('')
