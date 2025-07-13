import { describe, it, expect } from 'vitest'
import { parsePatternFilename } from '../../src/utils/pattern-parser.js'

describe('Pattern Parser Utils', () => {
  describe('filename parsing', () => {
    it('should extract page numbers from pattern filename', () => {
      const filename = 'menspajamashortsfinal_aiid2146907_page18to37.pdf'
      const result = parsePatternFilename(filename)
      
      expect(result.startPage).toBe(18)
      expect(result.endPage).toBe(37)
      expect(result.pageCount).toBe(20)
    })
  })
})