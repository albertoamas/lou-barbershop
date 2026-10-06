import { Component, type ReactNode } from 'react'
import { ApiError } from '../../infrastructure/http/apiClient'
import { buttonStyles } from './buttonStyles'
import { SystemStateCard } from './SystemStateCard'

interface ErrorBoundaryProps {
  children: ReactNode
}
interface ErrorBoundaryState {
  failed: boolean
  requestId?: string | undefined
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { failed: false }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      failed: true,
      requestId: error instanceof ApiError ? error.problem.requestId : undefined,
    }
  }

  public componentDidCatch(): void {
    // The exception and component stack may contain personal data from rendered values.
    console.error('Unexpected presentation error')
  }

  public render(): ReactNode {
    if (this.state.failed) {
      return (
        <SystemStateCard
          icon="alert"
          title="Algo salió mal"
          message="No pudimos mostrar esta pantalla y no se guardó nada por este error."
          note="Recarga la aplicación y revisa antes de volver a enviar datos."
          requestId={this.state.requestId}
          standalone
        >
          <button
            className={buttonStyles({ variant: 'primary' })}
            type="button"
            onClick={() => window.location.reload()}
          >
            Recargar
          </button>
          <a
            className={buttonStyles({ variant: 'secondary' })}
            href={window.location.pathname.startsWith('/app') ? '/app' : '/'}
          >
            Ir al inicio
          </a>
        </SystemStateCard>
      )
    }

    return this.props.children
  }
}
