import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scanNpmProject } from '../../../src/scanner/npm.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

vi.mock('fs/promises');
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

describe('npm scanner', () => {
  describe('scanNpmProject', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(existsSync).mockReturnValue(true);
    });

    it('should scan project and return scan results', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'lodash': '^4.17.21',
        },
      };

      const mockLockfile = {
        packages: {
          'node_modules/lodash': {
            version: '4.17.21',
            resolved: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
          },
        },
      };

      vi.mocked(readFile).mockImplementation(async (path: any) => {
        if (path.includes('package.json')) {
          return JSON.stringify(mockPackageJson);
        }
        if (path.includes('package-lock.json')) {
          return JSON.stringify(mockLockfile);
        }
        throw new Error('File not found');
      });

      const result = await scanNpmProject('/test/path');

      expect(result).toBeDefined();
      expect(result.totalPackages).toBeGreaterThan(0);
      expect(result.dependencies).toBeDefined();
      expect(result.scannedAt).toBeInstanceOf(Date);
    });

    it('should throw error when package.json is missing', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

      await expect(scanNpmProject('/invalid/path')).rejects.toThrow();
    });

    it('should include dev dependencies when option is enabled', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'lodash': '^4.17.21',
        },
        devDependencies: {
          'typescript': '^5.0.0',
        },
      };

      const mockLockfile = {
        packages: {
          'node_modules/lodash': {
            version: '4.17.21',
            resolved: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
          },
          'node_modules/typescript': {
            version: '5.0.0',
            resolved: 'https://registry.npmjs.org/typescript/-/typescript-5.0.0.tgz',
          },
        },
      };

      vi.mocked(readFile).mockImplementation(async (path: any) => {
        if (path.includes('package.json')) {
          return JSON.stringify(mockPackageJson);
        }
        if (path.includes('package-lock.json')) {
          return JSON.stringify(mockLockfile);
        }
        throw new Error('File not found');
      });

      const result = await scanNpmProject('/test/path', {
        projectPath: '/test/path',
        includeDevDependencies: true,
      });

      expect(result.dependencies.packages.length).toBe(2);
    });
  });
});
