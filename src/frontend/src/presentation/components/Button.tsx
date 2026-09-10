import type { VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../styles/cn'
import { buttonStyles } from './buttonStyles'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>

export const Button = ({ className, variant, width, ...props }: ButtonProps) => (
  <button className={cn(buttonStyles({ variant, width }), className)} {...props} />
)
