export interface Vulnerability {
  id: string;              // CVE-2023-12345
  severity: 'low' | 'moderate' | 'high' | 'critical';
  package: string;         // Package name
  version: string;         // Vulnerable version
  patched: string[];       // Patched versions
  description: string;
  references: string[];
  cvss: number;           // CVSS score
  epss?: number;          // Exploit prediction score
  isTransitive?: boolean; // Is this a transitive dependency?
  path?: string[];        // Dependency path
}

export interface DependencyTree {
  name: string;
  version: string;
  dependencies: Map<string, DependencyNode>;
  packages: PackageInfo[];
}

export interface DependencyNode {
  name: string;
  version: string;
  resolved: string;
  dependencies?: Map<string, DependencyNode>;
}

export interface PackageInfo {
  name: string;
  version: string;
  isDevDependency: boolean;
  isDirect: boolean;
}

export interface ScanResult {
  vulnerabilities: Vulnerability[];
  totalPackages: number;
  scannedAt: Date;
  dependencies: DependencyTree;
  summary: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
}

export interface ScanOptions {
  projectPath: string;
  includeDevDependencies?: boolean;
  analyzeReachability?: boolean;
  enhanceWithOSV?: boolean;
}
