import type { DependencyTree, DependencyNode } from '../scanner/types.js';

export interface GraphNode {
  id: string;
  name: string;
  version: string;
  depth: number;
  parent?: string;
  children: string[];
  vulnerabilities: number;
  isDevDependency: boolean;
}

export interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  edges: Array<{ from: string; to: string }>;
  roots: string[];
}

export function buildGraph(depTree: DependencyTree): DependencyGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: Array<{ from: string; to: string }> = [];
  const roots: string[] = [];

  // Build nodes from dependency tree
  for (const [name, dep] of depTree.dependencies) {
    const nodeId = `${name}@${dep.version}`;
    roots.push(nodeId);

    buildNodeRecursive(dep, nodeId, 0, undefined, nodes, edges, false);
  }

  return { nodes, edges, roots };
}

function buildNodeRecursive(
  dep: DependencyNode,
  nodeId: string,
  depth: number,
  parent: string | undefined,
  nodes: Map<string, GraphNode>,
  edges: Array<{ from: string; to: string }>,
  isDevDependency: boolean
): void {
  // Check if node already exists
  if (!nodes.has(nodeId)) {
    nodes.set(nodeId, {
      id: nodeId,
      name: dep.name,
      version: dep.version,
      depth,
      parent,
      children: [],
      vulnerabilities: 0,
      isDevDependency,
    });
  }

  // Add edge from parent to this node
  if (parent) {
    edges.push({ from: parent, to: nodeId });
    const parentNode = nodes.get(parent);
    if (parentNode && !parentNode.children.includes(nodeId)) {
      parentNode.children.push(nodeId);
    }
  }

  // Process children
  if (dep.dependencies) {
    for (const [childName, childDep] of dep.dependencies) {
      const childId = `${childName}@${childDep.version}`;
      buildNodeRecursive(
        childDep,
        childId,
        depth + 1,
        nodeId,
        nodes,
        edges,
        isDevDependency
      );
    }
  }
}

export function findDependencyPath(
  graph: DependencyGraph,
  packageName: string
): string[][] {
  const paths: string[][] = [];

  for (const root of graph.roots) {
    const rootNode = graph.nodes.get(root);
    if (!rootNode) continue;

    if (rootNode.name === packageName) {
      paths.push([root]);
    } else {
      const subPaths = findPathsRecursive(graph, root, packageName, [root]);
      paths.push(...subPaths);
    }
  }

  return paths;
}

function findPathsRecursive(
  graph: DependencyGraph,
  currentNodeId: string,
  targetPackage: string,
  currentPath: string[]
): string[][] {
  const paths: string[][] = [];
  const node = graph.nodes.get(currentNodeId);

  if (!node) {
    return paths;
  }

  for (const childId of node.children) {
    const childNode = graph.nodes.get(childId);
    if (!childNode) continue;

    const newPath = [...currentPath, childId];

    if (childNode.name === targetPackage) {
      paths.push(newPath);
    } else {
      const subPaths = findPathsRecursive(graph, childId, targetPackage, newPath);
      paths.push(...subPaths);
    }
  }

  return paths;
}

export function getDepth(graph: DependencyGraph, nodeId: string): number {
  const node = graph.nodes.get(nodeId);
  return node?.depth ?? -1;
}

export function getDirectDependencies(graph: DependencyGraph): GraphNode[] {
  return Array.from(graph.nodes.values()).filter(node => node.depth === 0);
}

export function getTransitiveDependencies(graph: DependencyGraph): GraphNode[] {
  return Array.from(graph.nodes.values()).filter(node => node.depth > 0);
}
