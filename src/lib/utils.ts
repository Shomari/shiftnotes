import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safe date parsing utility that handles invalid dates gracefully
 */
export function safeDate(dateInput: string | number | Date): Date | null {
  try {
    if (!dateInput || dateInput === '') return null
    
    const date = new Date(dateInput)
    return isNaN(date.getTime()) ? null : date
  } catch (error) {
    console.error('Error parsing date:', error)
    return null
  }
}

/**
 * Safe date formatting utility
 */
export function safeDateFormat(dateInput: string | number | Date, fallback: string = 'Invalid date'): string {
  const date = safeDate(dateInput)
  if (!date) return fallback
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Validates that a date string is a valid ISO date format
 */
export function validateDateString(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false
  
  const date = safeDate(dateString)
  return date !== null
}

/**
 * Safely converts any date input to ISO string format
 */
export function toISOString(dateInput: string | number | Date): string {
  const date = safeDate(dateInput)
  if (!date) {
    // Return today's date as fallback
    return new Date().toISOString()
  }
  return date.toISOString()
}
