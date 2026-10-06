import { useMemo } from 'react'
import { encode } from 'uqr'

// Drawn on the device from the setup link; the secret never leaves the browser.
export const QrCode = ({ value, label }: { value: string; label: string }) => {
  const { size, path } = useMemo(() => {
    const qr = encode(value, { ecc: 'M', border: 2 })
    const cells: string[] = []
    qr.data.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (dark) cells.push(`M${x} ${y}h1v1h-1z`)
      }),
    )
    return { size: qr.size, path: cells.join('') }
  }, [value])

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      className="size-56 rounded-control bg-surface"
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  )
}
