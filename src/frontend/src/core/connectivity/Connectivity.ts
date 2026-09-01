export type Connectivity = 'online' | 'offline'

export interface ConnectivitySource {
  getSnapshot(): Connectivity
  subscribe(listener: () => void): () => void
}
