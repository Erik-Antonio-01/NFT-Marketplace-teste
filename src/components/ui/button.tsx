import { Slot } from '@radix-ui/react-slot'
import type { ButtonHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost'; size?: 'default' | 'small'; asChild?: boolean }
export function Button({ variant = 'primary', size = 'default', asChild = false, className, ...props }: Props) {
  const Component = asChild ? Slot : 'button'
  return <Component className={twMerge('button', `button-${variant}`, size === 'small' && 'button-small', className)} {...props} />
}
