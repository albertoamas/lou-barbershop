import { Navigate, useLocation } from 'react-router-dom'

interface LegacyRedirectProps {
  to: string
  preserveHash?: boolean
}

export const LegacyRedirect = ({ to, preserveHash = false }: LegacyRedirectProps) => {
  const location = useLocation()
  return <Navigate to={`${to}${preserveHash ? location.hash : ''}`} replace />
}
