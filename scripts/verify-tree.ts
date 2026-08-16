import { findNarrator, getSubtree, getSubtreeStats } from '../lib/tree';
import * as path from 'path';
import * as fs from 'fs';

const DATA_PATH = path.join(__dirname, '../data/narrators.json');

function test() {
  console.log('--- Verifying tree logic ---');
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`Error: narrators.json does not exist at ${DATA_PATH}`);
    process.exit(1);
  }
  
  const narrators = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  console.log(`Loaded ${narrators.length} narrators.`);
  
  // Test search: U000004
  const codeQuery = 'U000004';
  const narrator = findNarrator(narrators, codeQuery);
  if (!narrator) {
    console.error(`Error: Could not find narrator with code ${codeQuery}`);
    process.exit(1);
  }
  
  console.log(`Found narrator:`, narrator);
  
  const subtree = getSubtree(narrators, narrator.id);
  if (!subtree) {
    console.error(`Error: Could not build subtree for narrator ID ${narrator.id}`);
    process.exit(1);
  }
  
  console.log(`Subtree Root:`, {
    id: subtree.id,
    code: subtree.code,
    name: subtree.name,
    childrenCount: subtree.children.length
  });
  
  const stats = getSubtreeStats(subtree);
  console.log(`Subtree Stats for U000004:`, stats);

  // Find a narrator with depth > 1 to verify multi-level hierarchy
  const deepNarrator = narrators.find((n: any) => n.depth > 1);
  if (deepNarrator) {
    console.log(`Found a deep narrator to check parent chain:`, deepNarrator);
    const parent = deepNarrator.parentId !== null ? findNarrator(narrators, deepNarrator.parentId) : null;
    console.log(`Deep narrator's parent:`, parent);
    if (parent && parent.parentId !== null) {
      const grandparent = findNarrator(narrators, parent.parentId);
      console.log(`Deep narrator's grandparent:`, grandparent);
    }
  }

  // Find the narrator with the largest number of descendants
  let maxDescendants = -1;
  let bestRoot: any = null;
  let bestStats: any = null;

  for (const n of narrators) {
    const sub = getSubtree(narrators, n.id);
    if (sub) {
      const subStats = getSubtreeStats(sub);
      if (subStats.totalDescendants > maxDescendants && n.parentId === null) {
        maxDescendants = subStats.totalDescendants;
        bestRoot = n;
        bestStats = subStats;
      }
    }
  }

  if (bestRoot) {
    console.log(`Root tree with the most descendants:`, bestRoot.code, `with`, maxDescendants, `descendants.`);
    console.log(`Stats for best root tree:`, bestStats);
  }
  
  console.log('Verification finished successfully!');
}

test();
