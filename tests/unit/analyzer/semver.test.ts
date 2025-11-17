import { describe, it, expect } from 'vitest';
import { analyzeVersionDiff, shouldAnalyzeBreakingChanges } from '../../../src/analyzer/semver.js';

describe('semver analyzer', () => {
  describe('analyzeVersionDiff', () => {
    it('should detect major version upgrade', () => {
      const diff = analyzeVersionDiff('1.0.0', '2.0.0');

      expect(diff.diffType).toBe('major');
      expect(diff.isUpgrade).toBe(true);
      expect(diff.isDowngrade).toBe(false);
      expect(diff.expectedBreakingChanges).toBe(true);
    });

    it('should detect minor version upgrade', () => {
      const diff = analyzeVersionDiff('1.0.0', '1.1.0');

      expect(diff.diffType).toBe('minor');
      expect(diff.isUpgrade).toBe(true);
      expect(diff.expectedBreakingChanges).toBe(false);
    });

    it('should detect patch version upgrade', () => {
      const diff = analyzeVersionDiff('1.0.0', '1.0.1');

      expect(diff.diffType).toBe('patch');
      expect(diff.isUpgrade).toBe(true);
      expect(diff.expectedBreakingChanges).toBe(false);
    });

    it('should detect downgrade', () => {
      const diff = analyzeVersionDiff('2.0.0', '1.0.0');

      expect(diff.isUpgrade).toBe(false);
      expect(diff.isDowngrade).toBe(true);
    });

    it('should throw error for invalid semver', () => {
      expect(() => analyzeVersionDiff('invalid', '1.0.0')).toThrow();
      expect(() => analyzeVersionDiff('1.0.0', 'invalid')).toThrow();
    });
  });

  describe('shouldAnalyzeBreakingChanges', () => {
    it('should always analyze major version bumps', () => {
      const diff = analyzeVersionDiff('1.0.0', '2.0.0');
      expect(shouldAnalyzeBreakingChanges(diff)).toBe(true);
    });

    it('should analyze minor version bumps', () => {
      const diff = analyzeVersionDiff('1.0.0', '1.1.0');
      expect(shouldAnalyzeBreakingChanges(diff)).toBe(true);
    });

    it('should analyze patch version bumps', () => {
      const diff = analyzeVersionDiff('1.0.0', '1.0.1');
      expect(shouldAnalyzeBreakingChanges(diff)).toBe(true);
    });

    it('should not analyze when versions are equal', () => {
      const diff = analyzeVersionDiff('1.0.0', '1.0.0');
      expect(shouldAnalyzeBreakingChanges(diff)).toBe(false);
    });
  });
});
