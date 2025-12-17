import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

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
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="flex-between mb-lg">
                <h2>🏷️ Manajemen Diskon & Promo</h2>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    + Tambah Diskon
                </button>
            </div>

            {/* Discounts List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {discounts.length === 0 ? (
                    <div className="glass-card text-center" style={{ padding: '3rem' }}>
                        <span style={{ fontSize: '4rem', opacity: 0.5 }}>🏷️</span>
                        <p className="mt-md text-muted">Belum ada diskon</p>
                    </div>
                ) : (
                    discounts.map(discount => (
                        <div key={discount.id} className="glass-card">
                            <div className="flex-between">
                                <div className="flex gap-md" style={{ alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: '2.5rem',
                                        opacity: discount.is_active ? 1 : 0.5
                                    }}>
                                        {discount.discount_type === 'percentage' ? '🔖' : '💵'}
                                    </span>
                                    <div>
                                        <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                                            <h4 style={{ opacity: discount.is_active ? 1 : 0.5 }}>{discount.name}</h4>
                                            {!discount.is_active && (
                                                <span className="badge badge-danger">Nonaktif</span>
                                            )}
                                        </div>
                                        <div style={{
                                            fontFamily: 'monospace',
                                            fontSize: '1.1rem',
                                            color: 'var(--primary)',
                                            fontWeight: '600'
                                        }}>
                                            {discount.code}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                            {discount.discount_type === 'percentage'
                                                ? `${discount.value}% off`
                                                : formatRupiah(discount.value) + ' off'}
                                            {discount.min_purchase > 0 && ` • Min. ${formatRupiah(discount.min_purchase)}`}
                                            {discount.max_discount && ` • Max. ${formatRupiah(discount.max_discount)}`}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                            Digunakan: {discount.usage_count}
                                            {discount.usage_limit && ` / ${discount.usage_limit}`}
                                            {discount.valid_until && ` • Berlaku hingga: ${new Date(discount.valid_until).toLocaleDateString('id-ID')}`}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-sm">
                                    <button
                                        className={`btn btn-sm ${discount.is_active ? 'btn-ghost' : 'btn-success'}`}
                                        onClick={() => toggleActive(discount)}
                                    >
                                        {discount.is_active ? '🔴 Nonaktifkan' : '🟢 Aktifkan'}
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(discount)}>
                                        ✏️
                                    </button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(discount.id)}>
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

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
            )}
        </div>
    )
}

export default DiscountsPage
