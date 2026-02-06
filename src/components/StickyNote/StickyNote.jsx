import React from 'react';
import styles from './StickyNote.module.css';
import { User, Plus, Trash2, Heart } from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';

const COLORS = [
    'var(--note-blue)',
    'var(--note-pink)',
    'var(--note-yellow)',
    'var(--note-green)',
    'var(--note-purple)'
];

const StickyNote = ({ node, style, onAddSpouse, onAddChild, onDelete, onEdit, totalNodes = 0 }) => {
    const { isAdmin } = useFamily();
    // Simple random color based on ID hash for consistency
    const colorIndex = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % COLORS.length;
    const backgroundColor = COLORS[colorIndex];

    // Helper to calculate Age
    const getAge = (birth, death) => {
        if (!birth) return '';
        const start = new Date(birth);
        const end = death ? new Date(death) : new Date();
        let age = end.getFullYear() - start.getFullYear();
        const m = end.getMonth() - start.getMonth();
        if (m < 0 || (m === 0 && end.getDate() < start.getDate())) {
            age--;
        }
        return age; // Return plain number
    };

    const age = getAge(node.birthDate, node.deathDate);

    // Format display string
    let dateDisplay = '';
    if (node.birthDate) {
        if (node.deathDate) {
            // Dead: Show Range (e.g. 1990 - 2020)
            const y1 = node.birthDate.split('-')[0];
            const y2 = node.deathDate.split('-')[0];
            dateDisplay = `${y1} - ${y2} (Alm. ${age} thn)`;
        } else {
            // Alive: Show Birth + Age
            dateDisplay = `${node.birthDate} (${age} thn)`;
        }
    } else {
        dateDisplay = '-';
    }

    return (
        <div
            className={`${styles.note} ${styles[node.gender]}`}
            style={{ ...style, backgroundColor }}
            onClick={() => onEdit && onEdit(node)}
        >
            <div className={styles.header}>
                <div className={styles.photo}>
                    {node.photo ? (
                        <img src={node.photo} alt={node.name} />
                    ) : (
                        <div className={styles.avatarPlaceholder}>
                            <User size={32} color="#777" />
                        </div>
                    )}
                </div>

                {isAdmin && totalNodes > 1 && (
                    <button className={styles.deleteBtn} onClick={(e) => {
                        e.stopPropagation();
                        if (node.children && node.children.length > 0) {
                            if (window.confirm('Note ini memiliki keturunan. Apakah Anda yakin ingin menghapusnya?')) {
                                onDelete(node.id);
                            }
                        } else {
                            onDelete(node.id);
                        }
                    }}>
                        <Trash2 size={12} />
                    </button>
                )}
            </div>

            <div className={styles.content}>
                <h3 className={styles.name}>{node.name}</h3>
                <div className={styles.info}>
                    <span>{dateDisplay}</span>
                </div>
            </div>

            <div className={styles.footer}>
                {/* Only Blood Members (non-isSpouse) can Add Spouse */}
                {!node.isSpouse && (
                    <button
                        className={styles.addBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddSpouse(node.id);
                        }}
                        title="Tambah Pasangan (Istri/Suami)"
                    >
                        <Heart size={12} /> Pasangan
                    </button>
                )}

                {/* Only Spouse Members (isSpouse) can Add Child */}
                {node.isSpouse && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // We need to find the blood parent (the spouse of this node)
                            // In this app, a spouse node is typically linked to 1 primary person.
                            if (node.spouses && node.spouses.length > 0) {
                                const spouseId = node.spouses[0];
                                onAddChild([node.id, spouseId]); // [Ibu, Ayah] - Klik Ibu, garis dari Ibu
                            }
                        }}
                        className={styles.addBtn}
                        style={{ marginLeft: '4px', background: '#e0f7fa', color: '#006064' }}
                        title="Tambah Anak (ke Pasangan ini)"
                    >
                        <Plus size={12} /> Anak
                    </button>
                )}
            </div>
        </div >
    );
};

export default StickyNote;
