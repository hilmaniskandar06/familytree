import React, { useMemo, useRef, useEffect, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useFamily } from '../../context/FamilyContext';
import { calculateLayout } from '../../utils/layout';
import StickyNote from '../StickyNote/StickyNote';
import ConnectionLines from './ConnectionLines';
import { Download, ZoomIn, ZoomOut, Maximize, Moon, Sun, RefreshCw, Search, Lock, Unlock } from 'lucide-react';
import { toPng } from 'html-to-image';
import styles from './InfiniteBoard.module.css';

import EditModal from '../EditModal/EditModal';
import FamilyStats from '../Stats/FamilyStats';

const InfiniteBoard = () => {
    const { nodes, addSpouse, addChild, deleteNode, updateNode, resetTree, isAdmin, toggleAdmin } = useFamily();
    const positions = useMemo(() => calculateLayout(nodes), [nodes]);
    const contentRef = useRef(null);
    const [editingNode, setEditingNode] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        return nodes.filter(n =>
            n.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5); // Limit to top 5 results
    }, [searchTerm, nodes]);

    const handleExport = async () => {
        if (contentRef.current && Object.keys(positions).length > 0) {
            try {
                // 1. Calculate the Bounding Box of all nodes
                const values = Object.values(positions);
                const minX = Math.min(...values.map(p => p.x));
                const maxX = Math.max(...values.map(p => p.x)) + 160; // Include node width
                const minY = Math.min(...values.map(p => p.y));
                const maxY = Math.max(...values.map(p => p.y)) + 180; // Include node height

                const width = maxX - minX + 200; // Add 100px padding each side
                const height = maxY - minY + 200;

                const bgColor = isDarkMode ? '#1e1e1e' : '#FDFCF0';

                // 2. Perform focused Export
                const dataUrl = await toPng(contentRef.current, {
                    backgroundColor: bgColor,
                    width: width,
                    height: height,
                    style: {
                        // Offset the original absolute positions + the container's 2000px padding
                        // and add a small margin (100px)
                        transform: `translate(${-minX + 100 - 2000}px, ${-minY + 100 - 2000}px)`,
                        width: `${width}px`,
                        height: `${height}px`,
                        padding: '0'
                    }
                });

                const link = document.createElement('a');
                link.download = 'family-tree.png';
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error('Export failed', err);
            }
        }
    };

    return (
        <div className={`${styles.boardContainer} ${isDarkMode ? styles.darkMode : ''}`}>
            <EditModal
                isOpen={!!editingNode}
                node={editingNode}
                onClose={() => setEditingNode(null)}
                onSave={updateNode}
            />

            <FamilyStats />

            <TransformWrapper
                initialScale={0.8}
                minScale={0.2}
                maxScale={2}
                centerOnInit={true}
                limitToBounds={false} // True infinite feel
            >
                {({ zoomIn, zoomOut, resetTransform, setTransform }) => {
                    // Auto-center on mount
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    useEffect(() => {
                        const timer = setTimeout(() => {
                            const screenW = window.innerWidth;
                            const screenH = window.innerHeight;
                            const scale = 0.8;
                            const target = nodes.find(n => n.name.toLowerCase().includes('father') || n.name.toLowerCase().includes('ayah')) || nodes[0];

                            if (target && positions[target.id]) {
                                const pos = positions[target.id];
                                const targetX = (pos.x + 2080) * scale;
                                const targetY = (pos.y + 2090) * scale;
                                setTransform(screenW / 2 - targetX, screenH / 2 - targetY, scale);
                            }
                        }, 100);
                        return () => clearTimeout(timer);
                    }, []); // Only on mount, not on every node addition

                    return (
                        <>
                            <div className={styles.controls}>
                                {/* ... controls code ... */}
                                <div className={styles.searchWrapper}>
                                    <div className={styles.searchBox}>
                                        <Search size={18} />
                                        <input
                                            type="text"
                                            placeholder="Cari nama..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    {searchResults.length > 0 && (
                                        <div className={styles.searchResults}>
                                            {searchResults.map(result => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => {
                                                        const pos = positions[result.id];
                                                        if (pos) {
                                                            const screenW = window.innerWidth;
                                                            const screenH = window.innerHeight;
                                                            const scale = 1.0;
                                                            const targetX = (pos.x + 2080) * scale;
                                                            const targetY = (pos.y + 2090) * scale;
                                                            setTransform(screenW / 2 - targetX, screenH / 2 - targetY, scale);
                                                            setSearchTerm(''); // Clear after select
                                                        }
                                                    }}
                                                >
                                                    {result.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.separator} />
                                <button onClick={toggleAdmin} title={isAdmin ? "Keluar Admin Mode" : "Masuk Admin Mode"}>
                                    {isAdmin ? <Unlock color="#3b82f6" /> : <Lock />}
                                </button>
                                {isAdmin && (
                                    <>
                                        <div className={styles.separator} />
                                        <button onClick={resetTree} title="Reset Data (Hapus Semua & Data Awal)" style={{ color: '#ff6b6b' }}>
                                            <RefreshCw />
                                        </button>
                                    </>
                                )}
                                <div className={styles.separator} />
                                <button onClick={() => setIsDarkMode(!isDarkMode)} title={isDarkMode ? "Mode Terang" : "Mode Gelap"}>
                                    {isDarkMode ? <Sun /> : <Moon />}
                                </button>
                                <div className={styles.separator} />
                                <button onClick={() => {
                                    const screenW = window.innerWidth;
                                    const screenH = window.innerHeight;
                                    const scale = 0.8;
                                    const target = nodes.find(n => n.name.toLowerCase().includes('father') || n.name.toLowerCase().includes('ayah')) || nodes[0];
                                    if (target && positions[target.id]) {
                                        const pos = positions[target.id];
                                        const targetX = (pos.x + 2080) * scale;
                                        const targetY = (pos.y + 2090) * scale;
                                        setTransform(screenW / 2 - targetX, screenH / 2 - targetY, scale);
                                    }
                                }} title="Reset Tampilan"><Maximize /></button>
                                <div className={styles.separator} />
                                <button onClick={handleExport} title="Simpan Gambar"><Download /></button>
                            </div>

                            <TransformComponent wrapperClass={styles.wrapper} contentClass={styles.content}>
                                <div ref={contentRef} className={styles.canvasContent}>
                                    <ConnectionLines
                                        nodes={nodes}
                                        positions={positions}
                                        onAddChild={addChild}
                                    />
                                    {nodes.length === 0 && (
                                        <div style={{ position: 'absolute', left: 2100, top: 2100, color: '#999' }}>
                                            Tidak ada data. Klik Reset Data atau tambah anggota baru.
                                        </div>
                                    )}
                                    {nodes.map(node => (
                                        <StickyNote
                                            key={node.id}
                                            node={node}
                                            totalNodes={nodes.length}
                                            style={{
                                                left: (positions[node.id]?.x || 0) + 2000,
                                                top: (positions[node.id]?.y || 0) + 2000
                                            }}
                                            onAddSpouse={() => addSpouse(node.id, { name: 'NAMA', birthDate: '', gender: 'female' })}
                                            onAddChild={(parentIds) => addChild(parentIds, { name: 'NAMA', birthDate: '', gender: 'male' })}
                                            onDelete={deleteNode}
                                            onEdit={(n) => setEditingNode(n)}
                                        />
                                    ))}
                                </div>
                            </TransformComponent>
                        </>
                    );
                }}
            </TransformWrapper>
        </div>
    );
};

export default InfiniteBoard;
