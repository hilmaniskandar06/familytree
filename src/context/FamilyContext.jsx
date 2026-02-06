import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const FamilyContext = createContext();

const INITIAL_DATA = [
    {
        id: 'root-1',
        name: 'Grandfather',
        birthDate: '1950-01-01',
        gender: 'male',
        spouses: ['root-2'],
        children: ['child-1'],
        photo: null,
    },
    {
        id: 'root-2',
        name: 'Grandmother',
        birthDate: '1955-05-15',
        gender: 'female',
        spouses: ['root-1'],
        children: ['child-1'],
        isSpouse: true,
        photo: null,
    },
    {
        id: 'child-1',
        name: 'Father',
        birthDate: '1980-08-20',
        gender: 'male',
        spouses: [],
        children: [], // No children yet
        parents: ['root-1', 'root-2'],
        photo: null,
    }
];

export const FamilyProvider = ({ children }) => {
    const [nodes, setNodes] = useState(() => {
        const saved = localStorage.getItem('family-tree-data');
        return saved ? JSON.parse(saved) : INITIAL_DATA;
    });

    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        localStorage.setItem('family-tree-data', JSON.stringify(nodes));
    }, [nodes]);

    const toggleAdmin = () => {
        if (isAdmin) {
            setIsAdmin(false);
        } else {
            const pass = window.prompt("Masukkan Password Admin:");
            if (pass === 'admin123') {
                setIsAdmin(true);
            } else if (pass !== null) {
                alert("Password Salah!");
            }
        }
    };

    const addNode = (newNode) => {
        setNodes((prev) => [...prev, { ...newNode, id: uuidv4() }]);
    };

    const updateNode = (id, updates) => {
        setNodes((prev) => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    };

    const deleteNode = (id) => {
        if (!isAdmin) {
            alert("Hanya Admin yang bisa menghapus data!");
            return;
        }

        const findDescendants = (nodeId, allNodes, acc = new Set()) => {
            const node = allNodes.find(n => n.id === nodeId);
            if (!node || !node.children) return acc;
            node.children.forEach(cId => {
                if (!acc.has(cId)) {
                    acc.add(cId);
                    findDescendants(cId, allNodes, acc);
                }
            });
            return acc;
        };

        const descendants = findDescendants(id, nodes);
        const affectedBloodline = new Set([id, ...Array.from(descendants)]);
        const targetsToDelete = new Set(Array.from(affectedBloodline));

        nodes.forEach(n => {
            if (affectedBloodline.has(n.id) && n.spouses) {
                n.spouses.forEach(sId => {
                    const spouseNode = nodes.find(sn => sn.id === sId);
                    if (spouseNode && spouseNode.isSpouse) targetsToDelete.add(sId);
                });
            }
        });

        const confirmMsg = targetsToDelete.size > 1
            ? `Keluarga didalam garis ini (${targetsToDelete.size} anggota) akan terhapus semua, apkah anda yang ingin menghapusnya?`
            : "Apakah Anda yakin ingin menghapus data ini?";

        if (!window.confirm(confirmMsg)) return;

        setNodes((prev) => {
            return prev
                .filter(n => !targetsToDelete.has(n.id))
                .map(n => ({
                    ...n,
                    spouses: n.spouses ? n.spouses.filter(sId => !targetsToDelete.has(sId)) : [],
                    children: n.children ? n.children.filter(cId => !targetsToDelete.has(cId)) : [],
                    parents: n.parents ? n.parents.filter(pId => !targetsToDelete.has(pId)) : []
                }));
        });
    };

    const addSpouse = (targetId, spouseData) => {
        const spouseId = uuidv4();
        const newSpouse = { ...spouseData, id: spouseId, spouses: [targetId], children: [], isSpouse: true };
        setNodes(prev => {
            const updatedTarget = prev.find(n => n.id === targetId);
            if (!updatedTarget) return prev;
            return [
                ...prev.map(n => n.id === targetId ? { ...n, spouses: [...(n.spouses || []), spouseId] } : n),
                newSpouse
            ];
        });
    };

    const addChild = (parentIds, childData) => {
        const parents = Array.isArray(parentIds) ? parentIds : [parentIds];
        const childId = uuidv4();
        const newChild = { ...childData, id: childId, parents: parents, spouses: [], children: [] };
        setNodes(prev => {
            const updatedNodes = prev.map(n => {
                if (parents.includes(n.id)) return { ...n, children: [...(n.children || []), childId] };
                return n;
            });
            return [...updatedNodes, newChild];
        });
    };

    const resetTree = () => {
        if (!isAdmin) {
            alert("Hanya Admin yang bisa me-reset data!");
            return;
        }
        if (window.confirm('Apakah Anda yakin ingin me-reset pohon keluarga ke data awal? Semua perubahan akan hilang.')) {
            setNodes(INITIAL_DATA);
            localStorage.setItem('family-tree-data', JSON.stringify(INITIAL_DATA));
        }
    };

    return (
        <FamilyContext.Provider value={{ nodes, addNode, updateNode, deleteNode, addSpouse, addChild, resetTree, isAdmin, toggleAdmin }}>
            {children}
        </FamilyContext.Provider>
    );
};

export const useFamily = () => useContext(FamilyContext);
