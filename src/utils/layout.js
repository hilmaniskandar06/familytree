export const calculateLayout = (nodes) => {
    const positions = {};

    // Config
    const NODE_WIDTH = 160; // Matches CSS width
    const NODE_HEIGHT = 180;
    // Increase Horizontal Gap significantly to prevent overlap of large subtrees
    const GAP_X = 120; // Increased for better spacing
    const GAP_Y = 450; // Vastly increased vertical distance for clear lines

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const processed = new Set();

    // Helper to get Node
    const get = (id) => nodeMap.get(id);

    // 1. Identify Forests (Roots)
    // Roots are nodes with no parents recorded in the current set
    const hasParents = new Set();
    nodes.forEach(n => {
        if (n.parents && n.parents.length > 0) {
            n.parents.forEach(pId => hasParents.add(n.id));
        }
    });

    // A "Root" for layout purposes is someone who is not a child of anyone in the list
    // OR, if circular checks fail, we fallback.
    // Note: Spouses shouldn't be treated as separate roots if they are attached to a root.
    let potentialRoots = nodes.filter(n => !hasParents.has(n.id));

    // Filter out spouses of existing roots OR spouses of anchored nodes (children)
    // Logic: If I am a spouse of X, and X has parents, then X is anchored. I shouldn't be a root.

    const anchoredNodes = new Set(hasParents);
    // Propagate anchor to spouses
    nodes.forEach(n => {
        if (anchoredNodes.has(n.id) && n.spouses) {
            n.spouses.forEach(sId => anchoredNodes.add(sId));
        }
    });

    potentialRoots = potentialRoots.filter(root => {
        // If I am anchored (spouse of a child), I cannot be a root
        if (anchoredNodes.has(root.id)) return false;
        return true;
    });

    const realRoots = [];
    const processedRoots = new Set();

    potentialRoots.forEach(r => {
        // If we already processed this node (e.g. as a spouse of a previous root), skip
        if (processedRoots.has(r.id)) return;

        realRoots.push(r);
        processedRoots.add(r.id);

        // Mark spouses as processed so they don't become roots
        if (r.spouses) {
            r.spouses.forEach(sId => processedRoots.add(sId));
        }
    });


    // RECURSIVE LAYOUT FUNCTION
    // Returns: { width, centerX } (relative to its own starting X)
    // Actually, we need to assign coordinates.

    // Strategy:
    // Post-order traversal: Calculate width of children first.
    // Then position parent above.

    const layoutNode = (nodeId, level, startX) => {
        if (processed.has(nodeId)) return { width: 0, centerX: 0 };
        processed.add(nodeId);

        const node = get(nodeId);
        if (!node) return { width: 0, centerX: 0 };

        // Identify Spouses
        const spouses = (node.spouses || []).map(id => get(id)).filter(Boolean);
        spouses.forEach(s => processed.add(s.id)); // Mark spouses as visited

        // Identify All Children involved with this family group
        // Children of Node + Children of Spouses
        // (Usually they are the same set if data is consistent, but we merge unique)
        let allChildrenIds = new Set(node.children || []);
        spouses.forEach(s => (s.children || []).forEach(cId => allChildrenIds.add(cId)));
        const children = Array.from(allChildrenIds);

        // 1. CALCULATE WIDTH OF THIS GENERATION (Node + Spouses)
        // Node + Gap + Spouse1 + Gap + Spouse2 ...
        const totalSpouses = spouses.length;
        const familyBlockWidth = (1 + totalSpouses) * NODE_WIDTH + (totalSpouses * GAP_X);

        // Center of the parents group (for linking to children)
        // If 1 person: center is w/2
        // If 2 people: center is (w + gap + w)/2 = w + gap/2
        const parentsCenterX = familyBlockWidth / 2;


        // 2. LAYOUT CHILDREN (Recursively)
        let childrenBlockWidth = 0;
        const childMetrics = []; // { id, width, centerX }

        if (children.length > 0) {
            children.forEach(cId => {
                const metric = layoutNode(cId, level + 1);
                childMetrics.push({ ...metric, id: cId });
            });

            // Calculate total width needed for children
            childrenBlockWidth = childMetrics.reduce((sum, m) => sum + m.width, 0)
                + (childMetrics.length - 1) * GAP_X;
        }

        // 3. DETERMINE FINAL WIDTH of this Subtree
        // It's the max of (Parents Width, Children Width)
        const totalWidth = Math.max(familyBlockWidth, childrenBlockWidth);


        // 4. ASSIGN POSITIONS
        // We need to align Parents Center and Children Center.

        // Center point of the total block
        const realCenterX = totalWidth / 2;

        // Position Parents centered within totalWidth
        const parentsStartX = realCenterX - (familyBlockWidth / 2);

        let currentX = parentsStartX;

        // Place Main Node
        positions[node.id] = { x: startX + currentX, y: level * GAP_Y };
        currentX += NODE_WIDTH + GAP_X;

        // Place Spouses
        spouses.forEach(s => {
            positions[s.id] = { x: startX + currentX, y: level * GAP_Y };
            currentX += NODE_WIDTH + GAP_X;
        });


        // Position Children centered within totalWidth
        if (children.length > 0) {
            const childrenStartX = realCenterX - (childrenBlockWidth / 2);
            let currentChildX = childrenStartX;

            childMetrics.forEach(m => {
                // Adjust child's subtree positions
                // The child logic returned coords assuming IT started at 0.
                // We need to shift its entire subtree to: startX + currentChildX
                // BUT: `layoutNode` logic above was conceptual. We probably need to store "relative" 
                // and then shift global positions. Or pass offsets.

                // REVISION: The recursive call ALREADY computed positions?? 
                // No, we haven't assigned global positions for children yet in the conceptual step.
                // Problem: `layoutNode` is called recursively. If we write to `positions` immediately,
                // we don't know the final X shift needed to center them under parents.

                // Better Approach:
                // `layoutNode` returns a strictly Local Layout Object (relative to 0,0) and Width.
                // Then we shift the returned subtree.
            });
        }

        // WAIT. Direct coordinate assignment is tricky with centering.
        // Let's use a simpler "Left-to-Right" Packing approach first, then Center parents.
        // Or: Reingold-Tilford is "Children determine Parent position".
        // Let's go with "Children Width determines Parent Group Position".

        return { width: totalWidth, centerX: realCenterX };
    };

    // RETRY: Simplified Shift-Based Layout
    // 1. Layout children first.
    // 2. Center parents over children.

    // Data Store for relative shifts
    const shifts = new Map(); // id -> x shift

    const GROUP_GAP = 400; // Extra space between children from different spouses

    const calculateTreeContent = (nodeId) => {
        const node = get(nodeId);
        if (!node) return { width: NODE_WIDTH, ids: [] };

        const spouses = (node.spouses || []).map(id => get(id)).filter(Boolean);

        // Group children by parent pair
        // Format: [ { spouseId: string | null, children: [metric1, metric2...] } ]
        const childGroups = [];

        // 1. Groups for each Spouse
        spouses.forEach(s => {
            const groupChildren = [];
            const childrenIds = (node.children || []).filter(cId => {
                const child = get(cId);
                return child && child.parents && child.parents.includes(s.id);
            });

            childrenIds.forEach(cId => {
                if (!processed.has(cId)) {
                    processed.add(cId);
                    const res = calculateTreeContent(cId);
                    groupChildren.push({ id: cId, ...res });
                }
            });

            if (groupChildren.length > 0) {
                childGroups.push({ spouseId: s.id, metrics: groupChildren });
            }
        });

        // 2. Group for Single Parent (children not in any spouse group)
        const processedThisLevel = new Set();
        childGroups.forEach(g => g.metrics.forEach(m => processedThisLevel.add(m.id)));

        const remainingChildrenIds = (node.children || []).filter(cId => !processedThisLevel.has(cId));
        const singleParentChildren = [];
        remainingChildrenIds.forEach(cId => {
            if (!processed.has(cId)) {
                processed.add(cId);
                const res = calculateTreeContent(cId);
                singleParentChildren.push({ id: cId, ...res });
            }
        });

        if (singleParentChildren.length > 0) {
            childGroups.push({ spouseId: null, metrics: singleParentChildren });
        }

        // Calculate Widths
        let childrenWidth = 0;
        const groupWidths = childGroups.map(group => {
            const width = group.metrics.reduce((sum, m) => sum + m.width, 0)
                + Math.max(0, (group.metrics.length - 1) * GAP_X);
            return width;
        });

        if (childGroups.length > 0) {
            childrenWidth = groupWidths.reduce((sum, w) => sum + w, 0)
                + (childGroups.length - 1) * GROUP_GAP;
        }

        const parentsWidth = NODE_WIDTH + (spouses.length * (NODE_WIDTH + GAP_X));
        const totalWidth = Math.max(childrenWidth, parentsWidth);

        // Store layout info
        shifts.set(nodeId, {
            width: totalWidth,
            parentsWidth,
            childrenWidth,
            spouses,
            childGroups,
            node
        });

        return { width: totalWidth, ids: [nodeId] };
    };

    // Second Pass: Assign X/Y coordinates
    const assignCoordinates = (nodeId, startX, startY) => {
        const data = shifts.get(nodeId);
        if (!data) return;

        const { width, parentsWidth, childrenWidth, spouses, childGroups, node } = data;

        // Center Parents relative to total Width
        const centerX = startX + width / 2;
        const parentsStartX = centerX - (parentsWidth / 2);

        // Assign Main Node
        positions[node.id] = { x: parentsStartX, y: startY };

        // Assign Spouses
        spouses.forEach((s, idx) => {
            positions[s.id] = { x: parentsStartX + (idx + 1) * (NODE_WIDTH + GAP_X), y: startY };
        });

        // Assign Children Groups
        if (childGroups.length > 0) {
            const childrenStartX = centerX - (childrenWidth / 2);
            let currentX = childrenStartX;

            childGroups.forEach((group, gIdx) => {
                group.metrics.forEach((m, mIdx) => {
                    assignCoordinates(m.id, currentX, startY + GAP_Y);
                    currentX += m.width + GAP_X;
                });

                // Add Group Gap between different ibu groups (minus the last GAP_X added)
                currentX = currentX - GAP_X + GROUP_GAP;
            });
        }
    };

    // Execution
    processed.clear(); // Reset 

    let currentRootX = 0;

    realRoots.forEach(root => {
        processed.add(root.id);
        const res = calculateTreeContent(root.id);

        // Perform assignment
        assignCoordinates(root.id, currentRootX, 0);

        currentRootX += res.width + 200; // Gap between separate trees
    });

    // Fallback for any nodes missed (orphans/links broken)
    nodes.forEach(n => {
        if (!positions[n.id]) {
            positions[n.id] = { x: currentRootX, y: 0 };
            currentRootX += NODE_WIDTH + GAP_X;
        }
    });

    return positions;
};
