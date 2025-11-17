import { SecureSync } from '../src/index.js';

async function main() {
  const scanner = new SecureSync({
    projectPath: process.cwd(),
  });

  console.log('Building dependency graph...\n');

  // Get the dependency graph
  const graph = await scanner.getDependencyGraph();

  console.log('Dependency Graph Summary:');
  console.log('========================');
  console.log(`Total packages: ${graph.nodes.size}`);
  console.log(`Total edges: ${graph.edges.length}`);
  console.log(`Root packages: ${graph.roots.length}\n`);

  // Visualize as tree
  console.log('Dependency Tree:');
  console.log('================');
  const treeVis = await scanner.visualizeDependencies({
    format: 'tree',
    maxDepth: 3,
    showVersions: true,
    highlightVulnerabilities: true,
  });
  console.log(treeVis);

  // Optionally output as DOT format for Graphviz
  if (process.argv.includes('--dot')) {
    console.log('\n\nDOT Format (for Graphviz):');
    console.log('==========================');
    const dotVis = await scanner.visualizeDependencies({
      format: 'dot',
      showVersions: false,
    });
    console.log(dotVis);
  }

  // Optionally output as JSON
  if (process.argv.includes('--json')) {
    console.log('\n\nJSON Format:');
    console.log('============');
    const jsonVis = await scanner.visualizeDependencies({
      format: 'json',
    });
    console.log(jsonVis);
  }
}

main().catch(console.error);
