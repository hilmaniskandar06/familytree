import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { compressImage } from '../../utils/imageHelpers';

const EditModal = ({ node, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        birthDate: '',
        deathDate: '', // Added deathDate
        gender: 'male',
        photo: ''
    });

    // Helper for File Upload
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setFormData(prev => ({
                    ...prev,
                    photo: compressed,
                    uploadDate: new Date().toLocaleDateString('id-ID')
                }));
            } catch (error) {
                alert('Gagal memproses gambar: ' + error.message);
            }
        }
    };

    const handleClear = () => {
        if (window.confirm('Hapus semua data di form ini?')) {
            setFormData({
                name: '',
                birthDate: '',
                deathDate: '',
                gender: 'male',
                photo: '',
                uploadDate: ''
            });
        }
    };

    useEffect(() => {
        if (node) {
            setFormData({
                name: node.name || '',
                birthDate: node.birthDate || '',
                deathDate: node.deathDate || '',
                gender: node.gender || 'male',
                photo: node.photo || '',
                uploadDate: node.uploadDate || ''
            });
        }
    }, [node]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(node.id, formData);
        onClose();
    };

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    const modalStyle = {
        background: 'white',
        padding: '24px',
        borderRadius: '16px',
        width: '320px',
        maxHeight: '90vh', // Prevent overflow on small screens
        overflowY: 'auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    };

    const inputGroupStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    };

    const labelStyle = {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#666'
    };

    const inputStyle = {
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        fontSize: '1rem'
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Edit Data</h2>
                    <button onClick={onClose} style={{ background: 'transparent', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Bersihkan Form
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Nama</label>
                        <input
                            style={inputStyle}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ ...inputGroupStyle, flex: 1 }}>
                            <label style={labelStyle}>Tgl Lahir</label>
                            <input
                                type="date"
                                style={inputStyle}
                                value={formData.birthDate}
                                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                            />
                        </div>
                        <div style={{ ...inputGroupStyle, flex: 1 }}>
                            <label style={labelStyle}>Tgl Meninggal</label>
                            <input
                                type="date"
                                style={inputStyle}
                                value={formData.deathDate}
                                onChange={(e) => setFormData({ ...formData, deathDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Gender</label>
                        <select
                            style={inputStyle}
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        >
                            <option value="male">Laki-laki</option>
                            <option value="female">Perempuan</option>
                        </select>
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Foto</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ ...inputStyle, padding: '4px' }}
                            />
                        </div>
                        {formData.photo && (
                            <div style={{ marginTop: '8px' }}>
                                <img src={formData.photo} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, photo: '', uploadDate: '' })}
                                    style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}
                                >
                                    Hapus Foto
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        style={{
                            marginTop: '16px',
                            background: '#4CAF50',
                            color: 'white',
                            padding: '12px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <Save size={18} /> Simpan
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditModal;
