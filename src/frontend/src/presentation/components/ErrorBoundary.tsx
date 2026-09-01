import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}
interface ErrorBoundaryState {
  failed: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { failed: false }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unexpected presentation error', { error, componentStack: info.componentStack })
  }

  public render(): ReactNode {
    if (this.state.failed) {
      return (
        <main className="content">
          <p className="eyebrow">No pudimos mostrar esta pantalla</p>
          <h1>La información sigue segura.</h1>
          <p className="lead">
            Recarga la aplicación. Si continúa, comunica el momento del error al responsable
            técnico.
          </p>
        </main>
      )
    }

    return this.props.children
  }
}
