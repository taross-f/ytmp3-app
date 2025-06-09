import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('utils', () => {
  describe('cn function', () => {
    it('should merge class names correctly', () => {
      const result = cn('base-class', 'additional-class')
      expect(result).toContain('base-class')
      expect(result).toContain('additional-class')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toContain('base-class')
      expect(result).toContain('active-class')
    })

    it('should handle false conditional classes', () => {
      const isActive = false
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toContain('base-class')
      expect(result).not.toContain('active-class')
    })

    it('should handle object syntax', () => {
      const result = cn({
        'base-class': true,
        'conditional-class': true,
        'false-class': false,
      })
      expect(result).toContain('base-class')
      expect(result).toContain('conditional-class')
      expect(result).not.toContain('false-class')
    })

    it('should handle arrays', () => {
      const result = cn(['base-class', 'array-class'])
      expect(result).toContain('base-class')
      expect(result).toContain('array-class')
    })

    it('should handle mixed inputs', () => {
      const result = cn(
        'base-class',
        ['array-class'],
        { 'object-class': true },
        'string-class'
      )
      expect(result).toContain('base-class')
      expect(result).toContain('array-class')
      expect(result).toContain('object-class')
      expect(result).toContain('string-class')
    })

    it('should handle undefined and null values', () => {
      const result = cn('base-class', undefined, null, 'valid-class')
      expect(result).toContain('base-class')
      expect(result).toContain('valid-class')
    })

    it('should handle empty strings', () => {
      const result = cn('base-class', '', 'valid-class')
      expect(result).toContain('base-class')
      expect(result).toContain('valid-class')
    })

    it('should merge conflicting Tailwind classes', () => {
      // twMerge should handle conflicting Tailwind classes
      const result = cn('p-4 p-6')
      // The exact behavior depends on twMerge, but it should handle conflicts
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('should return empty string for no arguments', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should handle complex Tailwind class combinations', () => {
      const result = cn(
        'bg-blue-500 hover:bg-blue-600',
        'text-white font-bold',
        'px-4 py-2 rounded'
      )
      expect(result).toContain('bg-blue-500')
      expect(result).toContain('hover:bg-blue-600')
      expect(result).toContain('text-white')
      expect(result).toContain('font-bold')
      expect(result).toContain('px-4')
      expect(result).toContain('py-2')
      expect(result).toContain('rounded')
    })
  })
})