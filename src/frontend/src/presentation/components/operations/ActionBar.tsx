import type { ReactNode } from 'react'

// Keeps the step's main action within reach while scrolling long lists: pinned above
// the phone navigation bar, at the bottom of the panel on larger screens.
export const ActionBar = ({ children }: { children: ReactNode }) => (
  <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 -mx-5 mt-6 -mb-5 grid gap-3 border-t border-line bg-surface/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 md:bottom-0 md:rounded-b-panel">
    {children}
  </div>
)
