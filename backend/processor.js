'use strict';
function validateEntry(raw) {
  const entry = raw.trim();

  if (!entry) return { valid: false };

  const arrowIdx = entry.indexOf('->');
  if (arrowIdx === -1) return { valid: false };

  const parent = entry.slice(0, arrowIdx);
  const child = entry.slice(arrowIdx + 2);

  if (!/^[A-Z]$/.test(parent) || !/^[A-Z]$/.test(child)) return { valid: false };

  if (parent === child) return { valid: false };

  return { valid: true, parent, child, normalized: `${parent}->${child}` };
}


function partitionEntries(data) {
  const invalid_entries = [];
  const duplicate_edges = [];
  const validEdges = [];

  const seenEdges = new Set();
  const dupReported = new Set();

  for (const raw of data) {
    const trimmed = raw.trim ? raw.trim() : String(raw).trim();
    const result = validateEntry(trimmed);

    if (!result.valid) {
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
function buildGraphGroups(validEdges) {
  const childOf = new Map();
  const parentOf = new Map();
  const allNodes = new Set();

  for (const { parent, child } of validEdges) {

    if (!parentOf.has(parent)) parentOf.set(parent, []);
    if (!childOf.has(child)) {
      childOf.set(child, parent);
      parentOf.get(parent).push(child);

      allNodes.add(parent);
      allNodes.add(child);
    }
  }
  const roots = [...allNodes].filter(n => !childOf.has(n)).sort();
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

  for (const root of roots) {
    if (!visited.has(root)) {
      const group = bfsGroup([root]);
      groups.push({ root, nodes: group });
    }
  }
  const remaining = [...allNodes].filter(n => !visited.has(n));
  if (remaining.length > 0) {
    const remVisited = new Set();
    for (const start of remaining.sort()) {
      if (remVisited.has(start)) continue;
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
      const cycleRoot = [...comp].sort()[0];
      groups.push({ root: cycleRoot, nodes: comp, isPureCycle: true });
    }
  }

  return { groups, parentOf, childOf };
}

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


function process(data) {
  const { invalid_entries, duplicate_edges, validEdges } = partitionEntries(data);
  const hierarchies = buildHierarchies(validEdges);
  const summary = buildSummary(hierarchies);

  return { invalid_entries, duplicate_edges, hierarchies, summary };
}

module.exports = { process };
