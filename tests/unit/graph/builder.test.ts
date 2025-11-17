import { describe, it, expect } from 'vitest';
import { buildGraph, findDependencyPath, getDirectDependencies, getTransitiveDependencies } from '../../../src/graph/builder.js';
import type { DependencyTree } from '../../../src/scanner/types.js';

describe('dependency graph builder', () => {
  const mockDepTree: DependencyTree = {
    name: 'test-project',
    version: '1.0.0',
    dependencies: new Map([
      [
        'package-a',
        {
          name: 'package-a',
          version: '1.0.0',
          resolved: 'https://registry.npmjs.org/package-a/-/package-a-1.0.0.tgz',
          dependencies: new Map([
            [
              'package-b',
              {
                name: 'package-b',
                version: '2.0.0',
                resolved: 'https://registry.npmjs.org/package-b/-/package-b-2.0.0.tgz',
              },
            ],
          ]),
        },
      ],
    ]),
    packages: [
      { name: 'package-a', version: '1.0.0', isDevDependency: false, isDirect: true },
      { name: 'package-b', version: '2.0.0', isDevDependency: false, isDirect: false },
    ],
  };

  describe('buildGraph', () => {
    it('should build dependency graph from dependency tree', () => {
      const graph = buildGraph(mockDepTree);

      expect(graph.nodes.size).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
      expect(graph.roots.length).toBeGreaterThan(0);
    });

    it('should create nodes for all dependencies', () => {
      const graph = buildGraph(mockDepTree);

      expect(graph.nodes.has('package-a@1.0.0')).toBe(true);
      expect(graph.nodes.has('package-b@2.0.0')).toBe(true);
    });

    it('should create edges between dependencies', () => {
      const graph = buildGraph(mockDepTree);

      const edge = graph.edges.find(
        e => e.from === 'package-a@1.0.0' && e.to === 'package-b@2.0.0'
      );
      expect(edge).toBeDefined();
    });
  });

  describe('getDirectDependencies', () => {
    it('should return only direct dependencies', () => {
      const graph = buildGraph(mockDepTree);
      const direct = getDirectDependencies(graph);

      expect(direct.length).toBe(1);
      expect(direct[0].name).toBe('package-a');
      expect(direct[0].depth).toBe(0);
    });
  });

  describe('getTransitiveDependencies', () => {
    it('should return only transitive dependencies', () => {
      const graph = buildGraph(mockDepTree);
      const transitive = getTransitiveDependencies(graph);

      expect(transitive.length).toBe(1);
      expect(transitive[0].name).toBe('package-b');
      expect(transitive[0].depth).toBeGreaterThan(0);
    });
  });

  describe('findDependencyPath', () => {
    it('should find path to a dependency', () => {
      const graph = buildGraph(mockDepTree);
      const paths = findDependencyPath(graph, 'package-b');

      expect(paths.length).toBeGreaterThan(0);
      expect(paths[0]).toContain('package-a@1.0.0');
      expect(paths[0]).toContain('package-b@2.0.0');
    });

    it('should return empty array for non-existent package', () => {
      const graph = buildGraph(mockDepTree);
      const paths = findDependencyPath(graph, 'non-existent');

      expect(paths).toEqual([]);
    });
  });
});
