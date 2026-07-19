import { clsx, type ClassValue } from 'clsx'

/** Une clases condicionalmente (wrapper de clsx). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
