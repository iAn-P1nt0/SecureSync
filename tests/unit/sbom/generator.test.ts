import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateSbom } from '../../../src/sbom/generator.js';
import type { ScanResult } from '../../../src/scanner/types.js';
import { scanNpmProject } from '../../../src/scanner/index.js';

vi.mock('../../../src/scanner/index.js');

const baseScanResult: ScanResult = {
  vulnerabilities: [
    {
      id: 'CVE-2024-0001',
      severity: 'high',
      package: 'lodash',
      version: '4.17.21',
      patched: ['4.17.22'],
      description: 'Prototype pollution',
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2024-0001'],
      cvss: 8.1,
    },
  ],
  totalPackages: 2,
  scannedAt: new Date('2024-02-01T00:00:00Z'),
  dependencies: {
    name: 'demo-app',
    version: '1.0.0',
    dependencies: new Map([
      [
        'lodash',
        {
          name: 'lodash',
          version: '4.17.21',
          resolved: '',
        },
      ],
      [
        'chalk',
        {
          name: 'chalk',
          version: '5.3.0',
          resolved: '',
        },
      ],
    ]),
    packages: [
      {
        name: 'lodash',
        version: '4.17.21',
        isDevDependency: false,
        isDirect: true,
      },
      {
        name: 'chalk',
        version: '5.3.0',
        isDevDependency: true,
        isDirect: true,
      },
    ],
  },
  summary: {
    critical: 0,
    high: 1,
    moderate: 0,
    low: 0,
  },
};

describe('SBOM generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scanNpmProject).mockResolvedValue(baseScanResult);
  });

  it('emits a CycloneDX SBOM with component stats', async () => {
    const result = await generateSbom('/tmp/project');

    expect(result.format).toBe('cyclonedx');
    expect(result.stats.totalComponents).toBe(2);
    expect(result.embeddedVulnerabilities).toBe(false);
    expect(result.document.components).toHaveLength(2);
    expect(scanNpmProject).toHaveBeenCalledWith('/tmp/project', expect.any(Object));
  });

  it('embeds vulnerabilities when requested for SPDX output', async () => {
    const result = await generateSbom('/tmp/project', {
      format: 'spdx',
      attachVulnerabilities: true,
    });

    expect(result.format).toBe('spdx');
    expect(result.embeddedVulnerabilities).toBe(true);
    expect(Array.isArray(result.document.annotations)).toBe(true);
    expect(result.document.annotations.length).toBeGreaterThan(0);
  });
});
