// Shared form and surface styles. Fields use 16 px text so iOS does not zoom, and a
// steel 400 border that meets the 3:1 non-text contrast minimum (plan section 3.4).
export const fieldClassName =
  'min-h-12 w-full rounded-control border border-line-control bg-surface px-4 text-base font-medium text-ink transition-[border-color] duration-150 placeholder:font-normal placeholder:text-ink-muted focus:border-ink disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted'

export const labelClassName = 'grid gap-2 text-sm font-semibold text-ink-soft'

export const panelClassName = 'rounded-panel bg-surface p-5 shadow-raised sm:p-6'

export const noticeClassName =
  'rounded-control bg-info-soft p-4 text-sm font-semibold text-info-ink'

export const successClassName =
  'rounded-control bg-success-soft p-4 text-sm font-semibold text-success-ink'

export const warningClassName =
  'rounded-control bg-warning-soft p-4 text-sm font-semibold text-warning-ink'

export const errorClassName =
  'rounded-control bg-danger-soft p-4 text-sm font-semibold text-danger-ink'
