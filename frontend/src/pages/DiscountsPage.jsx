import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../components/PageTitle'

function DiscountsPage() {
    const { authFetch, isAdmin } = useAuth()
    const [discounts, setDiscounts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [selectedDiscount, setSelectedDiscount] = useState(null)
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        discount_type: 'percentage',
        value: '',
        min_purchase: '',
        max_discount: '',
        valid_until: '',
        usage_limit: ''
    })

    useEffect(() => {
        fetchDiscounts()
    }, [])

    const fetchDiscounts = async () => {
        try {
            const response = await fetch('/api/discounts')
            const data = await response.json()
            setDiscounts(data)
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatRupiah = (amount) => `Rp ${amount.toLocaleString('id-ID')}`

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            const url = selectedDiscount
                ? `/api/discounts/${selectedDiscount.id}`
                : '/api/discounts'

            const response = await authFetch(url, {
                method: selectedDiscount ? 'PUT' : 'POST',
                body: JSON.stringify({
                    code: formData.code,
                    name: formData.name,
                    discount_type: formData.discount_type,
                    value: parseInt(formData.value),
                    min_purchase: parseInt(formData.min_purchase) || 0,
                    max_discount: formData.max_discount ? parseInt(formData.max_discount) : null,
                    valid_until: formData.valid_until || null,
                    usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null
                })
            })

            if (response.ok) {
                fetchDiscounts()
                resetForm()
            } else {
                const error = await response.json()
                alert(error.detail)
            }
        } catch (error) {
            alert('Error: ' + error.message)
        }
    }

    const handleEdit = (discount) => {
        setSelectedDiscount(discount)
        setFormData({
            code: discount.code,
            name: discount.name,
            discount_type: discount.discount_type,
            value: discount.value.toString(),
            min_purchase: discount.min_purchase.toString(),
            max_discount: discount.max_discount?.toString() || '',
            valid_until: discount.valid_until?.split('T')[0] || '',
            usage_limit: discount.usage_limit?.toString() || ''
        })
        setShowForm(true)
    }

    const handleDelete = async (id) => {
        if (!confirm('Hapus diskon ini?')) return

        try {
            const response = await authFetch(`/api/discounts/${id}`, { method: 'DELETE' })
            if (response.ok) {
                fetchDiscounts()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const toggleActive = async (discount) => {
        try {
            const response = await authFetch(`/api/discounts/${discount.id}`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: !discount.is_active })
            })
            if (response.ok) {
                fetchDiscounts()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const resetForm = () => {
        setShowForm(false)
        setSelectedDiscount(null)
        setFormData({
            code: '',
            name: '',
            discount_type: 'percentage',
            value: '',
            min_purchase: '',
            max_discount: '',
            valid_until: '',
            usage_limit: ''
        })
    }

    if (!isAdmin) {
        return (
            <div className="text-center" style={{ padding: '3rem' }}>
                <span style={{ fontSize: '4rem' }}>🔒</span>
                <h2 className="mt-md">Akses Ditolak</h2>
                <p className="text-muted">Halaman ini hanya untuk Admin</p>
            </div>
        )
    }

    if (loading) {
        return <div className="flex-center" style={{ height: '50vh' }}><div className="spinner"></div></div>
    }

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <PageTitle
                    title="Manajemen Diskon & Promo"
                    subtitle="Kelola kode promo dan penawaran spesial"
                />
                <button
                    onClick={() => setShowForm(true)}
                    style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                    🏷️ Tambah Diskon
                </button>
            </div>

            {/* Discounts Grid */}
            {discounts.length === 0 ? (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '64px', opacity: 0.3 }}>🏷️</span>
                    <p style={{ color: '#6b7280', marginTop: '16px' }}>Belum ada diskon atau promo</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {discounts.map(discount => (
                        <div
                            key={discount.id}
                            style={{
                                background: discount.is_active
                                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                    : 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)',
                                borderRadius: '16px',
                                padding: '24px',
                                color: 'white',
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                transition: 'transform 0.2s',
                                opacity: discount.is_active ? 1 : 0.7
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {/* Big Discount Badge */}
                            <div style={{
                                position: 'absolute',
                                top: '-10px',
                                right: '-10px',
                                width: '100px',
                                height: '100px',
                                background: 'rgba(255,255,255,0.2)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '32px',
                                fontWeight: '800',
                                backdropFilter: 'blur(10px)'
                            }}>
                                {discount.discount_type === 'percentage' ? `${discount.value}%` : '💰'}
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: '700',
                                    marginBottom: '8px',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}>
                                    {discount.name}
                                </div>
                                <div style={{
                                    fontFamily: 'monospace',
                                    fontSize: '18px',
                                    background: 'rgba(255,255,255,0.2)',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    display: 'inline-block',
                                    fontWeight: '600',
                                    backdropFilter: 'blur(10px)'
                                }}>
                                    {discount.code}
                                </div>
                            </div>

                            <div style={{ fontSize: '14px', marginBottom: '16px', opacity: 0.9 }}>
                                <div>💵 {discount.discount_type === 'percentage'
                                    ? `Diskon ${discount.value}%`
                                    : `Potongan ${formatRupiah(discount.value)}`}
                                </div>
                                {discount.min_purchase > 0 && (
                                    <div>🛒 Min. belanja {formatRupiah(discount.min_purchase)}</div>
                                )}
                                {discount.max_discount && (
                                    <div>📊 Max. diskon {formatRupiah(discount.max_discount)}</div>
                                )}
                                <div>📈 Terpakai: {discount.usage_count}{discount.usage_limit && ` / ${discount.usage_limit}`}</div>
                                {discount.valid_until && (
                                    <div>📅 Berlaku hingga {new Date(discount.valid_until).toLocaleDateString('id-ID')}</div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                <button
                                    onClick={() => toggleActive(discount)}
                                    style={{
                                        flex: 1,
                                        padding: '8px 16px',
                                        background: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        backdropFilter: 'blur(10px)',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                                    onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                                >
                                    {discount.is_active ? '❌ Nonaktifkan' : '✅ Aktifkan'}
                                </button>
                                <button
                                    onClick={() => handleEdit(discount)}
                                    style={{
                                        padding: '8px 16px',
                                        background: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => handleDelete(discount.id)}
                                    style={{
                                        padding: '8px 16px',
                                        background: 'rgba(239, 68, 68, 0.8)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{selectedDiscount ? '✏️ Edit Diskon' : '➕ Tambah Diskon'}</h2>
                            <button className="modal-close" onClick={resetForm}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Kode Promo *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                            placeholder="HEMAT10"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Nama Diskon *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Diskon 10%"
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Tipe Diskon</label>
                                        <select
                                            className="form-input"
                                            value={formData.discount_type}
                                            onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                                        >
                                            <option value="percentage">Persentase (%)</option>
                                            <option value="fixed">Nominal (Rp)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">
                                            Nilai {formData.discount_type === 'percentage' ? '(%)' : '(Rp)'} *
                                        </label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.value}
                                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                            placeholder={formData.discount_type === 'percentage' ? '10' : '5000'}
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Min. Pembelian (Rp)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.min_purchase}
                                            onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value })}
                                            placeholder="50000"
                                        />
                                    </div>
                                    {formData.discount_type === 'percentage' && (
                                        <div className="form-group">
                                            <label className="form-label">Max. Diskon (Rp)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={formData.max_discount}
                                                onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                                                placeholder="20000"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Berlaku Hingga</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.valid_until}
                                            onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Batas Penggunaan</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.usage_limit}
                                            onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                                            placeholder="100"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={resetForm}>Batal</button>
                                <button type="submit" className="btn btn-success">
                                    {selectedDiscount ? 'Simpan' : 'Tambah'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )
            }
        </div >
    )
}

export default DiscountsPage
