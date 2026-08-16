export type Narrator = {
  id: number;
  code: string;
  name: string | null;
  phone: string | null;
  parentId: number | null;
  parentCode: string | null;
  hours: number;
  clips: number;
  depth: number;
  rootCode: string;
};

export type TreeNode = Narrator & {
  children: TreeNode[];
};

export type SubtreeStats = {
  directChildrenCount: number;
  totalDescendants: number;
  maxDepthBelow: number;
  totalHours: number;
  totalClips: number;
  descendantHours: number;
  descendantClips: number;
  selfHours: number;
  selfClips: number;
};

export type LevelStats = {
  level: number;
  people: number;
  hours: number;
  clips: number;
};

/**
 * Computes per-relative-depth stats below a selected node.
 * Level 1 = direct children, level 2 = grandchildren, etc.
 * An optional `matchesFilter` predicate excludes nodes that don't pass filters.
 */
export function getPerLevelStats(
  subtree: TreeNode,
  matchesFilter?: (node: TreeNode) => boolean
): LevelStats[] {
  const levelMap = new Map<number, { people: number; hours: number; clips: number }>();

  function traverse(node: TreeNode, relativeDepth: number) {
    for (const child of node.children) {
      const level = relativeDepth + 1;
      // Only count nodes that pass the filter (or all nodes if no filter)
      if (!matchesFilter || matchesFilter(child)) {
        const entry = levelMap.get(level) || { people: 0, hours: 0, clips: 0 };
        entry.people += 1;
        entry.hours += child.hours;
        entry.clips += child.clips;
        levelMap.set(level, entry);
      }
      traverse(child, level);
    }
  }

  traverse(subtree, 0);

  // Convert to sorted array
  return Array.from(levelMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([level, data]) => ({
      level,
      people: data.people,
      hours: Number(data.hours.toFixed(3)),
      clips: data.clips,
    }));
}

/**
 * Builds a lookup map and links parent -> children nodes from the flat list of narrators.
 */
export function buildTree(narrators: Narrator[]): Map<number, TreeNode> {
  const map = new Map<number, TreeNode>();
  
  // Initialize all nodes in map
  for (const n of narrators) {
    map.set(n.id, { ...n, children: [] });
  }
  
  // Build parent-child relationships
  for (const n of narrators) {
    if (n.parentId !== null) {
      const parentNode = map.get(n.parentId);
      if (parentNode) {
        const currentNode = map.get(n.id);
        if (currentNode) {
          // Avoid duplicate children
          if (!parentNode.children.some(c => c.id === currentNode.id)) {
            parentNode.children.push(currentNode);
          }
        }
      }
    }
  }
  
  return map;
}

/**
 * Traverses deep to create a clean clone of a node and its children.
 * This prevents mutations in one view from bleeding into other logic.
 */
function cloneTreeNode(node: TreeNode): TreeNode {
  return {
    ...node,
    children: node.children.map(cloneTreeNode)
  };
}

/**
 * Retrieves the nested subtree starting from rootId.
 */
export function getSubtree(narrators: Narrator[], rootId: number): TreeNode | null {
  const map = buildTree(narrators);
  const rootNode = map.get(rootId);
  if (!rootNode) return null;
  
  return cloneTreeNode(rootNode);
}

/**
 * Recursively sums up descendants, max depth, hours, and clips.
 */
export function getSubtreeStats(subtree: TreeNode): SubtreeStats {
  let totalDescendants = 0;
  let maxDepthBelow = 0;
  let descendantHours = 0;
  let descendantClips = 0;
  
  function traverse(node: TreeNode, depth: number) {
    if (depth > maxDepthBelow) {
      maxDepthBelow = depth;
    }
    for (const child of node.children) {
      totalDescendants++;
      descendantHours += child.hours;
      descendantClips += child.clips;
      traverse(child, depth + 1);
    }
  }
  
  traverse(subtree, 0);
  
  return {
    directChildrenCount: subtree.children.length,
    totalDescendants,
    maxDepthBelow,
    totalHours: Number((descendantHours + subtree.hours).toFixed(3)),
    totalClips: descendantClips + subtree.clips,
    descendantHours: Number(descendantHours.toFixed(3)),
    descendantClips,
    selfHours: subtree.hours,
    selfClips: subtree.clips
  };
}

/**
 * Finds a narrator by numeric child_id or child_referral_code (case-insensitive).
 */
export function findNarrator(narrators: Narrator[], query: string | number): Narrator | null {
  if (typeof query === 'number') {
    return narrators.find(n => n.id === query) || null;
  }
  
  const qStr = String(query).trim();
  if (!qStr) return null;
  
  // Try matching numeric ID first
  const numericId = Number(qStr);
  if (!isNaN(numericId) && qStr === String(numericId)) {
    const found = narrators.find(n => n.id === numericId);
    if (found) return found;
  }
  
  // Case-insensitive match on referral code
  const upperQuery = qStr.toUpperCase();
  return narrators.find(n => n.code.toUpperCase() === upperQuery) || null;
}
