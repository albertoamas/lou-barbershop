import { cva } from 'class-variance-authority'

export const buttonStyles = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-bold tracking-tight transition-[transform,background-color,border-color,color,box-shadow] duration-300 ease-lou focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-sky-700 disabled:pointer-events-none disabled:opacity-55 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'border-lou-ink bg-lou-ink text-white shadow-lou-sm hover:-translate-y-px hover:bg-lou-charcoal',
        secondary:
          'border-lou-steel bg-white text-lou-ink shadow-lou-sm hover:-translate-y-px hover:bg-lou-paper',
        ghost: 'border-transparent bg-transparent text-lou-ink hover:bg-black/5',
        danger:
          'border-lou-danger bg-lou-danger text-white hover:-translate-y-px hover:bg-[#651d27]',
      },
      width: {
        auto: 'w-auto',
        full: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      width: 'auto',
    },
  },
)
