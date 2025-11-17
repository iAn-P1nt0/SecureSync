export {
  buildGraph,
  findDependencyPath,
  getDepth,
  getDirectDependencies,
  getTransitiveDependencies,
} from './builder.js';

export {
  visualize,
  printSummary,
} from './visualizer.js';

export type {
  GraphNode,
  DependencyGraph,
} from './builder.js';

export type {
  VisualizationOptions,
} from './visualizer.js';
