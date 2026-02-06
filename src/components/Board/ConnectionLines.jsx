import React from 'react';
import { Plus } from 'lucide-react';

const ConnectionLines = ({ nodes, positions, onAddChild }) => {
    const NODE_W = 160;
    const NODE_H = 180;

    const getPos = (id) => {
        const p = positions[id] || { x: 0, y: 0 };
        return { x: p.x + 2000, y: p.y + 2000 };
    };
    const getCenter = (id) => {
        const p = getPos(id);
        return { x: p.x + NODE_W / 2, y: p.y + NODE_H / 2 };
    };
    const getBottom = (id) => {
        const p = getPos(id);
        return { x: p.x + NODE_W / 2, y: p.y + NODE_H };
    }
    const getTop = (id) => {
        const p = getPos(id);
        return { x: p.x + NODE_W / 2, y: p.y };
    }

    const lines = [];
    const elements = []; // For buttons to be on top of lines
    const LINE_COLORS = [
        '#3b82f6', // Blue
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#ec4899', // Pink
        '#8b5cf6', // Violet
        '#06b6d4'  // Cyan
    ];
    const processedPairs = new Set();
    const childrenProcessed = new Set();

    // 1. Process Spouses and their Children
    nodes.forEach(node => {
        if (node.spouses) {
            node.spouses.forEach((spouseId, spouseIdx) => {
                const pairKey = [node.id, spouseId].sort().join('-');

                // FIX: Determine color based on the parent who has multiple spouses
                // This ensures each wife in a multi-wife family gets a unique color index.
                const otherNode = nodes.find(n => n.id === spouseId);
                let colorIdx = spouseIdx;
                if (node.spouses.length <= 1 && otherNode && otherNode.spouses && otherNode.spouses.length > 1) {
                    colorIdx = otherNode.spouses.indexOf(node.id);
                }
                const lineColor = LINE_COLORS[colorIdx % LINE_COLORS.length];

                // Draw spouse connection (horizontal)
                // Logic: Draw only once per pair
                if (node.id < spouseId) {
                    processedPairs.add(pairKey);

                    const p1 = getCenter(node.id);
                    const p2 = getCenter(spouseId);

                    // Midpoint for "Add Child" button and Child Line Source
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;


                    // Draw Spouse Line (Solid & Straight per request)
                    lines.push(
                        <path
                            key={`spouse-${pairKey}`}
                            d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`}
                            stroke="var(--color-line)"
                            strokeWidth="3"
                            fill="none"
                        />
                    );


                    // Draw Lines to Shared Children
                    // Find children who have BOTH node.id and spouseId as parents
                    const sharedChildren = nodes.filter(n =>
                        n.parents && n.parents.includes(node.id) && n.parents.includes(spouseId)
                    );

                    const childrenIds = new Set([...(node.children || []), ...(nodes.find(n => n.id === spouseId)?.children || [])]);

                    childrenIds.forEach(childId => {
                        if (!childrenProcessed.has(childId)) {
                            // Find child object to check parents
                            const childNode = nodes.find(n => n.id === childId);

                            // CRITICAL FIX: Only draw line if child belongs to BOTH parents in this specific loop pair.
                            // This prevents a child from Ibu 2 being processed in the Ayah-Ibu 1 loop.
                            if (!childNode || !childNode.parents || !childNode.parents.includes(node.id) || !childNode.parents.includes(spouseId)) {
                                return;
                            }

                            // Mark as processed ONLY after we know it belongs to this pair and will be drawn
                            childrenProcessed.add(childId);

                            // Determined Source:
                            // Logic: The "Creator" parent is the first one in the parents array (as set by StickyNote onAddChild)
                            // We check if the Creator is p1 (node.id) or p2 (spouseId).
                            // Default to p2 (Right/Spouse) if undetermined.
                            let source = getBottom(spouseId); // Default right

                            if (childNode && childNode.parents && childNode.parents.length > 0) {
                                const primaryParentId = childNode.parents[0];
                                if (primaryParentId === node.id) {
                                    source = getBottom(node.id); // Line from Left Node
                                } else if (primaryParentId === spouseId) {
                                    source = getBottom(spouseId); // Line from Right Node
                                }
                            }

                            const childTop = getTop(childId);

                            const startX = source.x;
                            const startY = source.y;
                            const endX = childTop.x;
                            const endY = childTop.y;

                            // We go straight down, then across, then down to child
                            // ADDED: colorIdx offset to prevent horizontal lines from merging/overlapping
                            // 20px difference per wife/husband pair, synced with color
                            const midY_Line = (startY + endY) / 2 + (colorIdx * 20);

                            lines.push(
                                <path
                                    key={`child-link-${childId}`}
                                    d={`M ${startX} ${startY} L ${startX} ${midY_Line} L ${endX} ${midY_Line} L ${endX} ${endY}`}
                                    stroke={lineColor}
                                    strokeWidth="3"
                                    fill="none"
                                />
                            );
                        }
                    });
                }
            });
        }
    });

    // 2. Process Single Parents (Nodes whose children were NOT processed above)
    nodes.forEach(node => {
        if (node.children) {
            // Verify child is not a spouse (prevent self-referential spouse-child lines)
            const allSpouses = new Set();
            if (node.spouses) node.spouses.forEach(s => allSpouses.add(s));

            node.children.forEach(childId => {
                // Safety: Do not treat a spouse as a child
                if (allSpouses.has(childId)) {
                    childrenProcessed.add(childId); // Mark as handled to prevent single-parent line
                    return;
                }

                if (!childrenProcessed.has(childId)) {
                    // This child was not drawn via a couple connection.
                    // Draw from single parent bottom.
                    const start = getBottom(node.id);
                    const end = getTop(childId);

                    // Single Parent Orthogonal Line

                    const midY_Line = (start.y + end.y) / 2;

                    lines.push(
                        <path
                            key={`child-single-${node.id}-${childId}`}
                            d={`M ${start.x} ${start.y} L ${start.x} ${midY_Line} L ${end.x} ${midY_Line} L ${end.x} ${end.y}`}
                            stroke="var(--color-line)"
                            strokeWidth="3"
                            fill="none"
                        />
                    );
                    childrenProcessed.add(childId);
                }
            });
        }
    });

    return (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
            {lines}
            {elements}
        </svg>
    );
};

export default ConnectionLines;
