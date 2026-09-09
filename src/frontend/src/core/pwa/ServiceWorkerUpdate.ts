export interface ServiceWorkerUpdateSource {
  getSnapshot(): boolean
  subscribe(listener: () => void): () => void
  apply(): Promise<void>
}
