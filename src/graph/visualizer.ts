import type { DependencyGraph, GraphNode } from './builder.js';

export interface VisualizationOptions {
  format: 'tree' | 'dot' | 'json';
  maxDepth?: number;
  showVersions?: boolean;
  highlightVulnerabilities?: boolean;
}

export function visualize(
  graph: DependencyGraph,
  options: VisualizationOptions = { format: 'tree' }
): string {
  switch (options.format) {
    case 'tree':
      return visualizeAsTree(graph, options);
    case 'dot':
      return visualizeAsDot(graph, options);
    case 'json':
      return visualizeAsJson(graph, options);
    default:
      throw new Error(`Unsupported format: ${options.format}`);
  }
}

function visualizeAsTree(graph: DependencyGraph, options: VisualizationOptions): string {
  const lines: string[] = [];
  const maxDepth = options.maxDepth ?? Infinity;
  const showVersions = options.showVersions ?? true;

  for (const rootId of graph.roots) {
    renderTreeNode(graph, rootId, 0, '', lines, maxDepth, showVersions, options.highlightVulnerabilities);
  }

  return lines.join('\n');
}

function renderTreeNode(
  graph: DependencyGraph,
  nodeId: string,
  depth: number,
  prefix: string,
  lines: string[],
  maxDepth: number,
  showVersions: boolean,
  highlightVulns?: boolean
): void {
  if (depth > maxDepth) {
    return;
  }

  const node = graph.nodes.get(nodeId);
  if (!node) return;

  const displayName = showVersions ? `${node.name}@${node.version}` : node.name;
  const vulnMarker = highlightVulns && node.vulnerabilities > 0 ? ` [${node.vulnerabilities} vuln(s)]` : '';
  const devMarker = node.isDevDependency ? ' (dev)' : '';

  lines.push(`${prefix}${displayName}${vulnMarker}${devMarker}`);

  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    const isLast = i === children.length - 1;
    const childPrefix = prefix + (isLast ? '└── ' : '├── ');
    const nextPrefix = prefix + (isLast ? '    ' : '│   ');

    const childId = children[i];
    renderTreeNode(
      graph,
      childId,
      depth + 1,
      childPrefix,
      lines,
      maxDepth,
      showVersions,
      highlightVulns
    );
  }
}

function visualizeAsDot(graph: DependencyGraph, options: VisualizationOptions): string {
  const lines: string[] = [];
  lines.push('digraph dependencies {');
  lines.push('  rankdir=LR;');
  lines.push('  node [shape=box];');

  // Add nodes
  for (const [id, node] of graph.nodes) {
    const label = options.showVersions ? `${node.name}@${node.version}` : node.name;
    const color = node.vulnerabilities > 0 && options.highlightVulnerabilities ? 'red' : 'black';
    const style = node.isDevDependency ? 'dashed' : 'solid';

    lines.push(`  "${id}" [label="${label}", color="${color}", style="${style}"];`);
  }

  // Add edges
  for (const edge of graph.edges) {
    lines.push(`  "${edge.from}" -> "${edge.to}";`);
  }

  lines.push('}');
  return lines.join('\n');
}

function visualizeAsJson(graph: DependencyGraph, options: VisualizationOptions): string {
  const data = {
    nodes: Array.from(graph.nodes.values()),
    edges: graph.edges,
    roots: graph.roots,
  };

  return JSON.stringify(data, null, 2);
}

export function printSummary(graph: DependencyGraph): string {
  const totalNodes = graph.nodes.size;
  const directDeps = Array.from(graph.nodes.values()).filter(n => n.depth === 0).length;
  const transitiveDeps = totalNodes - directDeps;
  const devDeps = Array.from(graph.nodes.values()).filter(n => n.isDevDependency).length;
  const vulnNodes = Array.from(graph.nodes.values()).filter(n => n.vulnerabilities > 0).length;

  const lines = [
    'Dependency Graph Summary',
    '========================',
    `Total packages: ${totalNodes}`,
    `Direct dependencies: ${directDeps}`,
    `Transitive dependencies: ${transitiveDeps}`,
    `Dev dependencies: ${devDeps}`,
    `Packages with vulnerabilities: ${vulnNodes}`,
  ];

  return lines.join('\n');
}
