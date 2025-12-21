import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../components/PageTitle'

function CustomersPage() {
    const { authFetch } = useAuth()
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showDebtOnly, setShowDebtOnly] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: ''
    })

    useEffect(() => {
        loadCustomers()
    }, [showDebtOnly])

    const loadCustomers = async () => {
        try {
            const url = showDebtOnly
                ? '/api/customers?has_debt=true'
                : '/api/customers'
            const response = await authFetch(url)
            if (response.ok) {
                const data = await response.json()
                setCustomers(data)
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const url = selectedCustomer
                ? `/api/customers/${selectedCustomer.id}`
                : '/api/customers'
            const response = await authFetch(url, {
                method: selectedCustomer ? 'PUT' : 'POST',
                body: JSON.stringify(formData)
            })
            if (response.ok) {
                loadCustomers()
                resetForm()
            } else {
                const error = await response.json()
                alert(error.detail)
            }
        } catch (error) {
            alert('Error: ' + error.message)
        }
    }

    const handleEdit = (customer) => {
        setSelectedCustomer(customer)
        setFormData({
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || ''
        })
        setShowForm(true)
    }

    const resetForm = () => {
        setShowForm(false)
        setSelectedCustomer(null)
        setFormData({ name: '', phone: '', email: '', address: '' })
    }

    const handlePayDebt = async (customerId, debtId) => {
        const amount = prompt('Masukkan jumlah pembayaran:')
        if (!amount) return

        try {
            const response = await authFetch(`/api/customers/${customerId}/debts/${debtId}/pay`, {
                method: 'POST',
                body: JSON.stringify({ amount: parseInt(amount) })
            })
            if (response.ok) {
                loadCustomers()
                alert('Pembayaran berhasil!')
            } else {
                const error = await response.json()
                alert(error.detail)
            }
        } catch (error) {
            alert('Error: ' + error.message)
        }
    }

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery))
    )

    const totalDebt = customers.reduce((sum, c) => sum + (c.total_debt || 0), 0)

    if (loading) {
        return <div className="flex-center" style={{ height: '50vh' }}><div className="spinner"></div></div>
    }

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <PageTitle
                    title="Pelanggan"
                    subtitle="Kelola data pelanggan dan hutang"
                />
                <button
                    onClick={() => setShowForm(true)}
                    style={{
                        padding: '10px 20px',
                        background: '#4f46e5',
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
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#4338ca'}
                    onMouseLeave={(e) => e.target.style.background = '#4f46e5'}
                >
                    ➕ Tambah Pelanggan
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 mb-6">
                <div className="card">
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#4f46e5', marginBottom: '8px' }}>
                        {customers.length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Pelanggan</div>
                </div>
                <div className="card">
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>
                        Rp {totalDebt.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Hutang</div>
                </div>
                <div className="card">
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b', marginBottom: '8px' }}>
                        {customers.filter(c => c.member_level === 'Gold').length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Member Gold</div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="card mb-6" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <input
                            type="text"
                            placeholder="🔍 Cari nama atau telepon..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="form-input"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input
                            type="checkbox"
                            checked={showDebtOnly}
                            onChange={(e) => setShowDebtOnly(e.target.checked)}
                            style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Hanya yang Punya Hutang</span>
                    </label>
                </div>
            </div>

            {/* Customer Table (Desktop) */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Pelanggan</th>
                            <th>Kontak</th>
                            <th>Member</th>
                            <th>Hutang</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map(customer => (
                            <tr key={customer.id}>
                                <td>
                                    <div className="user-cell">
                                        <div className="user-avatar-small" style={{
                                            background: customer.member_level === 'Gold' ? 'rgba(241, 196, 15, 0.2)' :
                                                customer.member_level === 'Silver' ? 'rgba(149, 165, 166, 0.2)' :
                                                    'rgba(211, 84, 0, 0.1)',
                                            color: customer.member_level === 'Gold' ? '#f1c40f' :
                                                customer.member_level === 'Silver' ? '#7f8c8d' :
                                                    '#d35400'
                                        }}>
                                            {customer.member_level === 'Gold' ? '🥇' :
                                                customer.member_level === 'Silver' ? '🥈' : '🥉'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{customer.name}</div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>ID: #{customer.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span className="text-muted">📱 {customer.phone || '-'}</span>
                                        {customer.email && <span className="text-muted">📧 {customer.email}</span>}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span className={`status-badge status-${customer.member_level.toLowerCase()}`}>
                                            {customer.member_level}
                                        </span>
                                        <span className="text-muted">⭐ {customer.points} Poin</span>
                                        <span className="text-muted">🛒 Rp {customer.total_spent.toLocaleString()}</span>
                                    </div>
                                </td>
                                <td>
                                    {customer.total_debt > 0 ? (
                                        <span className="status-badge status-inactive" style={{ fontSize: '0.85rem' }}>
                                            ⚠️ Rp {customer.total_debt.toLocaleString()}
                                        </span>
                                    ) : (
                                        <span className="status-badge status-active">Lunas</span>
                                    )}
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(customer)} title="Edit">
                                            ✏️
                                        </button>
                                        {customer.total_debt > 0 && (
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={() => handlePayDebt(customer.id, customer.id)}
                                                title="Bayar Hutang"
                                            >
                                                💵
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Customer Cards (Mobile Only) */}
            <div className="mobile-card-list">
                {filteredCustomers.map(customer => (
                    <div key={customer.id} className="mobile-card" style={{
                        borderLeft: customer.total_debt > 0 ? '4px solid var(--danger)' : '1px solid var(--border)'
                    }}>
                        <div className="mobile-card-header">
                            <div className="user-cell">
                                <div className="user-avatar-small" style={{
                                    background: customer.member_level === 'Gold' ? 'rgba(241, 196, 15, 0.2)' :
                                        customer.member_level === 'Silver' ? 'rgba(149, 165, 166, 0.2)' :
                                            'rgba(211, 84, 0, 0.1)',
                                    color: customer.member_level === 'Gold' ? '#f1c40f' :
                                        customer.member_level === 'Silver' ? '#7f8c8d' :
                                            '#d35400'
                                }}>
                                    {customer.member_level === 'Gold' ? '🥇' :
                                        customer.member_level === 'Silver' ? '🥈' : '🥉'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 600 }}>{customer.name}</span>
                                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>{customer.phone || '-'}</span>
                                </div>
                            </div>
                            <span className={`status-badge status-${customer.member_level.toLowerCase()}`}>
                                {customer.member_level}
                            </span>
                        </div>

                        <div className="mobile-card-row">
                            <span className="mobile-card-label">Total Belanja</span>
                            <span className="mobile-card-value">Rp {customer.total_spent.toLocaleString()}</span>
                        </div>

                        <div className="mobile-card-row">
                            <span className="mobile-card-label">Poin Loyalty</span>
                            <span className="mobile-card-value">{customer.points} ⭐</span>
                        </div>

                        {customer.total_debt > 0 && (
                            <div className="mobile-card-row" style={{ marginTop: '8px', color: 'var(--danger)', fontWeight: 'bold' }}>
                                <span>⚠️ Hutang</span>
                                <span>Rp {customer.total_debt.toLocaleString()}</span>
                            </div>
                        )}

                        <div className="mobile-card-actions">
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleEdit(customer)}
                            >
                                ✏️ Edit
                            </button>
                            {customer.total_debt > 0 && (
                                <button
                                    className="btn btn-success btn-sm"
                                    onClick={() => handlePayDebt(customer.id, customer.id)}
                                >
                                    💵 Bayar Hutang
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{selectedCustomer ? '✏️ Edit Pelanggan' : '➕ Tambah Pelanggan'}</h2>
                            <button className="modal-close" onClick={resetForm}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nama *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Nama pelanggan"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">No. Telepon</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="08xxxxxxxxxx"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="email@contoh.com"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Alamat</label>
                                    <textarea
                                        className="form-input"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        rows={3}
                                        placeholder="Alamat lengkap"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                                    Batal
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {selectedCustomer ? 'Update' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CustomersPage
