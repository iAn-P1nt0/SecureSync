import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import packageJson from '../../package.json' assert { type: 'json' };
import { scanNpmProject } from '../scanner/index.js';
import type {
  DependencyNode,
  DependencyTree,
  PackageInfo,
  ScanResult,
  Vulnerability,
} from '../scanner/types.js';
import type { SbomGenerateOptions, SbomGenerationResult, SbomFormat, SbomStats } from './types.js';

const CYCLONEDX_SPEC_VERSION = '1.5';
const SPDX_VERSION = 'SPDX-2.3';

type DependencyGraph = Map<string, Set<string>>;

type PackageMetadata = {
  info: PackageInfo;
  bomRef: string;
  spdxRef: string;
};

interface PackageMetadataMap {
  byKey: Map<string, PackageMetadata>;
  byBomRef: Map<string, PackageMetadata>;
}

interface SpdxAnnotation {
  spdxElementId: string;
  annotationType: string;
  annotator: string;
  comment: string;
  annotationDate: string;
}

export async function generateSbom(
  projectPath: string,
  options: Partial<SbomGenerateOptions> = {}
): Promise<SbomGenerationResult> {
  const scanResult = await scanNpmProject(projectPath, {
    projectPath,
    includeDevDependencies: options.includeDevDependencies,
  });

  const format: SbomFormat = options.format ?? 'cyclonedx';
  const generatedAt = new Date();

  const stats = buildStats(scanResult.dependencies.packages);
  const document =
    format === 'cyclonedx'
      ? buildCycloneDxBom(scanResult, generatedAt, options)
      : buildSpdxDocument(scanResult, generatedAt, options);
  const embeddedVulnerabilities = Boolean(options.attachVulnerabilities && scanResult.vulnerabilities.length > 0);

  let outputPath: string | undefined;
  if (options.outputFile) {
    outputPath = resolve(projectPath, options.outputFile);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(document, null, 2), 'utf-8');
  }

  return {
    format,
    document,
    outputPath,
    generatedAt,
    stats,
    vulnerabilities: scanResult.vulnerabilities,
    embeddedVulnerabilities,
  };
}

function buildStats(packages: PackageInfo[] = []): SbomStats {
  const stats: SbomStats = {
    totalComponents: packages.length,
    directDependencies: packages.filter(pkg => pkg.isDirect).length,
    devDependencies: packages.filter(pkg => pkg.isDevDependency).length,
  };

  return stats;
}

function buildCycloneDxBom(
  scanResult: ScanResult,
  generatedAt: Date,
  options: Partial<SbomGenerateOptions>
): Record<string, any> {
  const tree = scanResult.dependencies;
  const serialNumber = `urn:uuid:${randomUUID()}`;
  const rootComponent = buildRootComponent(tree, options);
  const packageMap = buildPackageMetadataMap(tree.packages);
  const graph = buildDependencyGraph(tree);
  const components = buildComponentsArray(packageMap.byKey);
  const dependencies = buildDependencyEntries(graph);

  const bom: Record<string, any> = {
    bomFormat: 'CycloneDX',
    specVersion: CYCLONEDX_SPEC_VERSION,
    serialNumber,
    version: 1,
    metadata: {
      timestamp: generatedAt.toISOString(),
      tools: [
        {
          vendor: 'SecureSync',
          name: 'SecureSync',
          version: typeof packageJson.version === 'string' ? packageJson.version : 'unknown',
        },
      ],
      component: rootComponent,
    },
    components,
    dependencies,
  };

  if (options.attachVulnerabilities && scanResult.vulnerabilities.length > 0) {
    bom.vulnerabilities = buildCycloneDxVulnerabilities(
      scanResult.vulnerabilities,
      packageMap.byKey
    );
  }

  return bom;
}

function buildSpdxDocument(
  scanResult: ScanResult,
  generatedAt: Date,
  options: Partial<SbomGenerateOptions>
): Record<string, any> {
  const tree = scanResult.dependencies;
  const namespace = `urn:uuid:${randomUUID()}`;
  const packageMap = buildPackageMetadataMap(tree.packages);
  const graph = buildDependencyGraph(tree);
  const packages = buildSpdxPackages(tree, packageMap.byKey, options);
  const relationships = buildSpdxRelationships(tree, packageMap.byBomRef, graph, options);
  const annotations = options.attachVulnerabilities
    ? buildSpdxAnnotations(scanResult.vulnerabilities, packageMap.byKey, generatedAt)
    : [];

  return {
    SPDXID: 'SPDXRef-DOCUMENT',
    spdxVersion: SPDX_VERSION,
    dataLicense: 'CC0-1.0',
    name: `${options.metadata?.componentName ?? tree.name} SBOM`,
    documentNamespace: namespace,
    creationInfo: {
      created: generatedAt.toISOString(),
      creators: [`Tool: SecureSync ${typeof packageJson.version === 'string' ? packageJson.version : 'unknown'}`],
      licenseListVersion: '3.23',
    },
    packages,
    relationships,
    annotations,
  };
}

function buildRootComponent(tree: DependencyTree, options: Partial<SbomGenerateOptions>) {
  const componentName = options.metadata?.componentName ?? tree.name;
  const componentVersion = options.metadata?.componentVersion ?? tree.version;

  return {
    bomRef: createBomRef(componentName, componentVersion),
    type: 'application',
    name: componentName,
    version: componentVersion,
    purl: createBomRef(componentName, componentVersion),
    supplier: options.metadata?.supplier
      ? {
          name: options.metadata.supplier,
        }
      : undefined,
  };
}

function buildPackageMetadataMap(packages: PackageInfo[]): PackageMetadataMap {
  const byKey = new Map<string, PackageMetadata>();
  const byBomRef = new Map<string, PackageMetadata>();

  for (const pkg of packages) {
    const key = createKey(pkg.name, pkg.version);
    const metadata: PackageMetadata = {
      info: pkg,
      bomRef: createBomRef(pkg.name, pkg.version),
      spdxRef: createSpdxRef(pkg.name, pkg.version),
    };
    byKey.set(key, metadata);
    byBomRef.set(metadata.bomRef, metadata);
  }

  return { byKey, byBomRef };
}

function buildComponentsArray(packageMap: Map<string, PackageMetadata>) {
  const components = [];

  for (const metadata of packageMap.values()) {
    const { info, bomRef } = metadata;
    components.push({
      bomRef,
      type: 'library',
      name: info.name,
      version: info.version,
      purl: bomRef,
      scope: info.isDevDependency ? 'optional' : 'required',
      properties: [
        {
          name: 'securesync:direct',
          value: info.isDirect ? 'true' : 'false',
        },
      ],
    });
  }

  return components;
}

function buildDependencyGraph(tree: DependencyTree): DependencyGraph {
  const graph: DependencyGraph = new Map();
  const rootRef = createBomRef(tree.name, tree.version);
  graph.set(rootRef, new Set());

  for (const node of tree.dependencies.values()) {
    const childRef = createBomRef(node.name, node.version);
    graph.get(rootRef)!.add(childRef);
    traverseNode(node, graph);
  }

  return graph;
}

function traverseNode(node: DependencyNode, graph: DependencyGraph): void {
  const nodeRef = createBomRef(node.name, node.version);
  if (!graph.has(nodeRef)) {
    graph.set(nodeRef, new Set());
  }

  if (!node.dependencies) {
    return;
  }

  for (const child of node.dependencies.values()) {
    const childRef = createBomRef(child.name, child.version);
    graph.get(nodeRef)!.add(childRef);
    traverseNode(child, graph);
  }
}

function buildDependencyEntries(graph: DependencyGraph) {
  const entries = [];
  for (const [ref, deps] of graph.entries()) {
    entries.push({
      ref,
      dependsOn: Array.from(deps),
    });
  }
  return entries;
}

function buildCycloneDxVulnerabilities(
  vulnerabilities: Vulnerability[],
  packageMap: Map<string, PackageMetadata>
) {
  const ratingsMap: Record<string, string> = {
    low: 'low',
    moderate: 'medium',
    high: 'high',
    critical: 'critical',
  };

  return vulnerabilities.map(vuln => {
    const key = createKey(vuln.package, vuln.version);
    const component = packageMap.get(key);

    return {
      id: vuln.id,
      source: {
        name: vuln.references?.[0]?.includes('nvd') ? 'NVD' : 'SecureSync',
      },
      ratings: [
        {
          severity: ratingsMap[vuln.severity] ?? 'unknown',
          score: vuln.cvss ?? undefined,
          method: vuln.cvss ? 'CVSSv3' : undefined,
        },
      ].filter(Boolean),
      details: vuln.description,
      affects: component
        ? [
            {
              ref: component.bomRef,
            },
          ]
        : [],
      advisories: (vuln.references || []).map(ref => ({ url: ref })),
    };
  });
}

function buildSpdxPackages(
  tree: DependencyTree,
  packageMap: Map<string, PackageMetadata>,
  options: Partial<SbomGenerateOptions>
) {
  const packages = [];

  const rootName = options.metadata?.componentName ?? tree.name;
  const rootVersion = options.metadata?.componentVersion ?? tree.version;

  packages.push({
    name: rootName,
    SPDXID: createSpdxRef(rootName, rootVersion),
    versionInfo: rootVersion,
    supplier: options.metadata?.supplier ? `Organization: ${options.metadata.supplier}` : 'NOASSERTION',
    downloadLocation: 'NOASSERTION',
    primaryPackagePurpose: 'APPLICATION',
    licenseConcluded: 'NOASSERTION',
    licenseDeclared: 'NOASSERTION',
  });

  for (const metadata of packageMap.values()) {
    const { info, spdxRef } = metadata;
    packages.push({
      name: info.name,
      SPDXID: spdxRef,
      versionInfo: info.version,
      downloadLocation: 'NOASSERTION',
      primaryPackagePurpose: 'LIBRARY',
      licenseConcluded: 'NOASSERTION',
      licenseDeclared: 'NOASSERTION',
      externalRefs: [
        {
          referenceCategory: 'PACKAGE-MANAGER',
          referenceType: 'purl',
          referenceLocator: createBomRef(info.name, info.version),
        },
      ],
    });
  }

  return packages;
}

function buildSpdxRelationships(
  tree: DependencyTree,
  packageMap: Map<string, PackageMetadata>,
  graph: DependencyGraph,
  options: Partial<SbomGenerateOptions>
) {
  const relationships = [];
  const rootName = options.metadata?.componentName ?? tree.name;
  const rootVersion = options.metadata?.componentVersion ?? tree.version;
  const rootRef = createSpdxRef(rootName, rootVersion);
  const rootBomRef = createBomRef(tree.name, tree.version);

  relationships.push({
    spdxElementId: 'SPDXRef-DOCUMENT',
    relationshipType: 'DESCRIBES',
    relatedSpdxElement: rootRef,
  });

  for (const [parent, dependencies] of graph.entries()) {
    const parentMetadata = packageMap.get(parent);
    const parentSpdx = parent === rootBomRef
      ? rootRef
      : parentMetadata?.spdxRef;

    if (!parentSpdx) {
      continue;
    }

    for (const child of dependencies) {
      const childSpdx = packageMap.get(child)?.spdxRef;
      if (!childSpdx) {
        continue;
      }
      relationships.push({
        spdxElementId: parentSpdx,
        relationshipType: 'DEPENDS_ON',
        relatedSpdxElement: childSpdx,
      });
    }
  }

  return relationships;
}

function buildSpdxAnnotations(
  vulnerabilities: Vulnerability[],
  packageMap: Map<string, PackageMetadata>,
  generatedAt: Date
): SpdxAnnotation[] {
  return vulnerabilities
    .map(vuln => {
      const key = createKey(vuln.package, vuln.version);
      const metadata = packageMap.get(key);
      if (!metadata) {
        return null;
      }

      return {
        spdxElementId: metadata.spdxRef,
        annotationType: 'REVIEW',
        annotator: 'Tool: SecureSync',
        comment: `${vuln.id} (${vuln.severity}) - ${vuln.description}`,
        annotationDate: generatedAt.toISOString(),
      };
    })
    .filter((annotation): annotation is SpdxAnnotation => Boolean(annotation));
}

function createBomRef(name: string, version: string): string {
  if (name.startsWith('@')) {
    const [scope, pkgName] = name.split('/');
    const encodedScope = encodeURIComponent(scope ?? '');
    const encodedName = encodeURIComponent(pkgName ?? '');
    return `pkg:npm/${encodedScope}/${encodedName}@${version}`;
  }

  return `pkg:npm/${encodeURIComponent(name)}@${version}`;
}

function createKey(name: string, version: string): string {
  return `${name}@${version}`;
}

function createSpdxRef(name: string, version: string): string {
  const base = `${name}-${version}`
    .replace(/[^A-Za-z0-9-.]+/g, '-')
    .replace(/-+/g, '-');
  return `SPDXRef-${base}`;
}
