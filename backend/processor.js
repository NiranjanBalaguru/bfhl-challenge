'use strict';

// ─── Step 1: Validate & Partition ─────────────────────────────────────────────

/**
 * Valid: X->Y  where X,Y ∈ [A-Z] (single char each), X ≠ Y
 * Returns {valid: bool, reason?: string}
 */
function validateEntry(raw) {
  const entry = raw.trim();

  if (!entry) return { valid: false };

  // Must contain exactly "->"
  const arrowIdx = entry.indexOf('->');
  if (arrowIdx === -1) return { valid: false };

  const parent = entry.slice(0, arrowIdx);
  const child = entry.slice(arrowIdx + 2);

  // Both must be single uppercase letters
  if (!/^[A-Z]$/.test(parent) || !/^[A-Z]$/.test(child)) return { valid: false };

  // Self-loop
  if (parent === child) return { valid: false };

  return { valid: true, parent, child, normalized: `${parent}->${child}` };
}

// ─── Step 2: Dedup ────────────────────────────────────────────────────────────

function partitionEntries(data) {
  const invalid_entries = [];
  const duplicate_edges = [];
  const validEdges = []; // [{parent, child, normalized}]

  const seenEdges = new Set();    // for dup detection
  const dupReported = new Set();  // report each dup label only once

  for (const raw of data) {
    const trimmed = raw.trim ? raw.trim() : String(raw).trim();
    const result = validateEntry(trimmed);

    if (!result.valid) {
      // Push trimmed original (spec says trim first, then validate)
      invalid_entries.push(trimmed || raw);
      continue;
    }

    const { parent, child, normalized } = result;

    if (seenEdges.has(normalized)) {
      if (!dupReported.has(normalized)) {
        duplicate_edges.push(normalized);
        dupReported.add(normalized);
      }
      continue;
    }

    seenEdges.add(normalized);
    validEdges.push({ parent, child, normalized });
  }

  return { invalid_entries, duplicate_edges, validEdges };
}

// ─── Step 3: Build Adjacency & Groups ────────────────────────────────────────

function buildGraphGroups(validEdges) {
  // childOf tracks the FIRST parent to win (multi-parent rule: first wins)
  const childOf = new Map();     // child -> parent  (first-encountered only)
  const parentOf = new Map();    // parent -> [children]
  const allNodes = new Set();

  for (const { parent, child } of validEdges) {
    allNodes.add(parent);
    allNodes.add(child);

    if (!parentOf.has(parent)) parentOf.set(parent, []);

    // Multi-parent rule: only first parent edge for each child is kept
    if (!childOf.has(child)) {
      childOf.set(child, parent);
      parentOf.get(parent).push(child);
    }
    // else: silently discard subsequent parent edges
  }

  // Find all true roots: nodes that never appear as child
  const roots = [...allNodes].filter(n => !childOf.has(n)).sort();

  // Group nodes into trees via Union-Find for connected-component detection
  // We'll do simple BFS grouping from each root, then handle orphaned cycle nodes
  const visited = new Set();
  const groups = [];

  function bfsGroup(startNodes) {
    const group = new Set();
    const queue = [...startNodes];
    while (queue.length) {
      const node = queue.shift();
      if (group.has(node)) continue;
      group.add(node);
      visited.add(node);
      const children = parentOf.get(node) || [];
      for (const c of children) queue.push(c);
    }
    return group;
  }

  // Each root seeds its own group
  for (const root of roots) {
    if (!visited.has(root)) {
      const group = bfsGroup([root]);
      groups.push({ root, nodes: group });
    }
  }

  // Remaining unvisited nodes are in pure cycles (no root)
  const remaining = [...allNodes].filter(n => !visited.has(n));
  if (remaining.length > 0) {
    // Find connected components among remaining nodes
    const remVisited = new Set();
    for (const start of remaining.sort()) {
      if (remVisited.has(start)) continue;
      // BFS using both parent and child links to find full cycle component
      const comp = new Set();
      const q = [start];
      while (q.length) {
        const n = q.shift();
        if (comp.has(n)) continue;
        comp.add(n);
        remVisited.add(n);
        for (const c of (parentOf.get(n) || [])) q.push(c);
        if (childOf.has(n)) q.push(childOf.get(n));
      }
      // Lex smallest node is the root for pure cycles
      const cycleRoot = [...comp].sort()[0];
      groups.push({ root: cycleRoot, nodes: comp, isPureCycle: true });
    }
  }

  return { groups, parentOf, childOf };
}

// ─── Step 4: Cycle detection & tree building ──────────────────────────────────

function hasCycleInGroup(root, parentOf, groupNodes) {
  const visited = new Set();
  const recStack = new Set();

  function dfs(node) {
    visited.add(node);
    recStack.add(node);
    for (const child of (parentOf.get(node) || [])) {
      if (!groupNodes.has(child)) continue;
      if (!visited.has(child)) {
        if (dfs(child)) return true;
      } else if (recStack.has(child)) {
        return true;
      }
    }
    recStack.delete(node);
    return false;
  }

  return dfs(root);
}

function buildChildren(node, parentOf) {
  const obj = {};
  const children = parentOf.get(node) || [];
  for (const child of children) {
    obj[child] = buildChildren(child, parentOf);
  }
  return obj;
}

function buildNestedTree(root, parentOf) {
  return { [root]: buildChildren(root, parentOf) };
}

function calcDepth(node, parentOf) {
  const children = parentOf.get(node) || [];
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map(c => calcDepth(c, parentOf)));
}

// ─── Step 5: Assemble hierarchies ─────────────────────────────────────────────

function buildHierarchies(validEdges) {
  const { groups, parentOf } = buildGraphGroups(validEdges);

  const hierarchies = [];

  for (const { root, nodes, isPureCycle } of groups) {
    let cycleDetected = false;

    if (isPureCycle) {
      cycleDetected = true;
    } else {
      cycleDetected = hasCycleInGroup(root, parentOf, nodes);
    }

    if (cycleDetected) {
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      const tree = buildNestedTree(root, parentOf);
      const depth = calcDepth(root, parentOf);
      hierarchies.push({ root, tree, depth });
    }
  }

  return hierarchies;
}

// ─── Step 6: Summary ──────────────────────────────────────────────────────────

function buildSummary(hierarchies) {
  const trees = hierarchies.filter(h => !h.has_cycle);
  const cycles = hierarchies.filter(h => h.has_cycle);

  let largest_tree_root = '';
  let maxDepth = -1;

  for (const t of trees) {
    if (t.depth > maxDepth || (t.depth === maxDepth && t.root < largest_tree_root)) {
      maxDepth = t.depth;
      largest_tree_root = t.root;
    }
  }

  return {
    total_trees: trees.length,
    total_cycles: cycles.length,
    largest_tree_root,
  };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

function process(data) {
  const { invalid_entries, duplicate_edges, validEdges } = partitionEntries(data);
  const hierarchies = buildHierarchies(validEdges);
  const summary = buildSummary(hierarchies);

  return { invalid_entries, duplicate_edges, hierarchies, summary };
}

module.exports = { process };
