import React, { useMemo } from 'react';
import { useFamily } from '../../context/FamilyContext';
import styles from './FamilyStats.module.css';
import { Users, UserPlus, Baby, Heart } from 'lucide-react';

const FamilyStats = () => {
    const { nodes } = useFamily();

    const stats = useMemo(() => {
        const counts = {
            anak: 0,
            menantu: 0,
            cucu: 0,
            cucuMenantu: 0,
            cicit: 0,
            cicitMenantu: 0,
            total: nodes.length
        };

        if (nodes.length === 0) return counts;

        const nodeLevels = {};
        const queue = [];

        // 1. Identify "Base Roots" (bloodline ancestors with no parents)
        const bloodlineRoots = nodes.filter(n => (!n.parents || n.parents.length === 0) && !n.isSpouse);

        bloodlineRoots.forEach(root => {
            nodeLevels[root.id] = 0;
            queue.push(root.id);
        });

        // 2. BFS to propagate levels through bloodline and spouses
        let head = 0;
        while (head < queue.length) {
            const currentId = queue[head++];
            const currentLevel = nodeLevels[currentId];
            const currentNode = nodes.find(n => n.id === currentId);
            if (!currentNode) continue;

            // Handle Spouses (same level)
            if (currentNode.spouses) {
                currentNode.spouses.forEach(sId => {
                    if (nodeLevels[sId] === undefined) {
                        nodeLevels[sId] = currentLevel;
                        queue.push(sId);
                    }
                });
            }

            // Handle Children (level + 1)
            if (currentNode.children) {
                currentNode.children.forEach(cId => {
                    if (nodeLevels[cId] === undefined) {
                        nodeLevels[cId] = currentLevel + 1;
                        queue.push(cId);
                    }
                });
            }

            // Handle Parent (if we somehow started mid-tree, but queue starts at roots)
            // But for spouses who were added first, we might need to find their partner
            if (currentNode.isSpouse && currentNode.spouses) {
                currentNode.spouses.forEach(pId => {
                    if (nodeLevels[pId] === undefined) {
                        nodeLevels[pId] = currentLevel;
                        queue.push(pId);
                    }
                });
            }
        }

        // 3. Count based on levels and status
        Object.keys(nodeLevels).forEach(id => {
            const node = nodes.find(n => n.id === id);
            if (!node || nodeLevels[id] === 0) return; // Skip roots (Level 0)

            const level = nodeLevels[id];

            if (level === 1) {
                if (node.isSpouse) counts.menantu++;
                else counts.anak++;
            } else if (level === 2) {
                if (node.isSpouse) counts.cucuMenantu++;
                else counts.cucu++;
            } else if (level === 3) {
                if (node.isSpouse) counts.cicitMenantu++;
                else counts.cicit++;
            }
        });

        return counts;
    }, [nodes]);

    return (
        <div className={styles.statsPanel}>
            <div className={styles.statsHeader}>
                <Users size={16} />
                <span>Statistik Keluarga</span>
            </div>
            <div className={styles.statsGrid}>
                <StatItem label="Anak" value={stats.anak} icon={<Baby size={14} color="#3b82f6" />} />
                <StatItem label="Menantu" value={stats.menantu} icon={<Heart size={14} color="#ec4899" />} />
                <StatItem label="Cucu" value={stats.cucu} icon={<Baby size={14} color="#10b981" />} />
                <StatItem label="Cucu Menantu" value={stats.cucuMenantu} icon={<Heart size={14} color="#f59e0b" />} />
                <StatItem label="Cicit" value={stats.cicit} icon={<Baby size={14} color="#8b5cf6" />} />
                <StatItem label="Cicit Menantu" value={stats.cicitMenantu} icon={<Heart size={14} color="#6366f1" />} />
            </div>
            <div className={styles.totalFooter}>
                <span>Total: {stats.total} Anggota</span>
            </div>
        </div>
    );
};

const StatItem = ({ label, value, icon }) => (
    <div className={styles.statItem}>
        <div className={styles.statLabel}>
            {icon}
            <span>{label}</span>
        </div>
        <div className={styles.statValue}>{value}</div>
    </div>
);

export default FamilyStats;
