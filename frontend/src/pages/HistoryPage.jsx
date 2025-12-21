import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../components/PageTitle'

function HistoryPage() {
    const { authFetch } = useAuth()
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedTransaction, setSelectedTransaction] = useState(null)
    const [filter, setFilter] = useState({
        payment_method: '',
        date_from: '',
        date_to: ''
    })

    useEffect(() => {
        fetchTransactions()
    }, [])

    const fetchTransactions = async () => {
        try {
            let url = '/api/transactions?limit=100'
            if (filter.payment_method) url += `&payment_method=${filter.payment_method}`
            if (filter.date_from) url += `&date_from=${filter.date_from}`
            if (filter.date_to) url += `&date_to=${filter.date_to}`

            const response = await fetch(url)
            const data = await response.json()
            setTransactions(data)
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatRupiah = (amount) => `Rp ${amount?.toLocaleString('id-ID') || 0}`

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getTotalItems = (items) => items?.reduce((sum, item) => sum + item.quantity, 0) || 0

    const getPaymentIcon = (method) => {
        switch (method) {
            case 'cash': return '💵'
            case 'qris': return '📱'
            case 'debit': return '💳'
            case 'credit': return '💳'
            default: return '💰'
        }
    }

    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0)
    const totalTransactions = transactions.length
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    if (loading) {
        return <div className="flex-center" style={{ height: '50vh' }}><div className="spinner"></div></div>
    }

    return (
        <div className="page-container">
            <PageTitle
                title="Riwayat Transaksi"
                subtitle="Lihat dan cari riwayat transaksi penjualan"
            />

            {/* Summary Stats */}
            <div className="grid grid-cols-3 mb-6">
                <div className="card">
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total Transaksi</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#4f46e5', marginBottom: '4px' }}>
                        {totalTransactions}
                    </div>
                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>transaksi tercatat</div>
                </div>
                <div className="card">
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total Pendapatan</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
                        {formatRupiah(totalRevenue)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>akumulasi penjualan</div>
                </div>
                <div className="card">
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Rata-rata</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px' }}>
                        {formatRupiah(avgTransaction)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>per transaksi</div>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                    🔍 Filter & Pencarian
                </h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 150px', minWidth: '150px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
                            Metode Pembayaran
                        </label>
                        <select
                            className="form-input"
                            value={filter.payment_method}
                            onChange={(e) => setFilter({ ...filter, payment_method: e.target.value })}
                            style={{ width: '100%' }}
                        >
                            <option value="">Semua</option>
                            <option value="cash">Cash</option>
                            <option value="qris">QRIS</option>
                            <option value="debit">Debit</option>
                            <option value="credit">Credit</option>
                        </select>
                    </div>
                    <div style={{ flex: '1 1 150px', minWidth: '150px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
                            Dari Tanggal
                        </label>
                        <input
                            type="date"
                            className="form-input"
                            value={filter.date_from}
                            onChange={(e) => setFilter({ ...filter, date_from: e.target.value })}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div style={{ flex: '1 1 150px', minWidth: '150px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
                            Sampai Tanggal
                        </label>
                        <input
                            type="date"
                            className="form-input"
                            value={filter.date_to}
                            onChange={(e) => setFilter({ ...filter, date_to: e.target.value })}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <button
                        onClick={fetchTransactions}
                        style={{
                            padding: '10px 20px',
                            background: '#4f46e5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#4338ca'}
                        onMouseLeave={(e) => e.target.style.background = '#4f46e5'}
                    >
                        🔍 Filter
                    </button>
                    <button
                        onClick={() => {
                            setFilter({ payment_method: '', date_from: '', date_to: '' })
                            setTimeout(fetchTransactions, 100)
                        }}
                        style={{
                            padding: '10px 20px',
                            background: '#f3f4f6',
                            color: '#374151',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#e5e7eb'}
                        onMouseLeave={(e) => e.target.style.background = '#f3f4f6'}
                    >
                        ✕ Reset
                    </button>
                </div>
            </div>

            {/* Transactions List */}
            {transactions.length === 0 ? (
                <div className="glass-card text-center" style={{ padding: '3rem' }}>
                    <span style={{ fontSize: '4rem', opacity: 0.5 }}>📋</span>
                    <p className="mt-md text-muted">Belum ada transaksi</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {transactions.map(transaction => (
                        <div
                            key={transaction.id}
                            className="glass-card"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedTransaction(
                                selectedTransaction?.id === transaction.id ? null : transaction
                            )}
                        >
                            <div className="flex-between">
                                <div className="flex gap-md" style={{ alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.5rem' }}>
                                        {getPaymentIcon(transaction.payment_method)}
                                    </span>
                                    <div>
                                        <div style={{ fontWeight: '600' }}>
                                            #{transaction.id.toString().padStart(6, '0')}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                                            {formatDate(transaction.created_at)}
                                        </div>
                                        {transaction.user_name && (
                                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                Kasir: {transaction.user_name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{
                                        fontWeight: '700',
                                        fontSize: '1.25rem',
                                        background: 'var(--primary-gradient)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}>
                                        {formatRupiah(transaction.total)}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                                        {getTotalItems(transaction.items)} item • {transaction.payment_method.toUpperCase()}
                                    </div>
                                    {transaction.discount_code && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>
                                            🏷️ {transaction.discount_code}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {selectedTransaction?.id === transaction.id && (
                                <div style={{
                                    marginTop: '1rem',
                                    paddingTop: '1rem',
                                    borderTop: '1px solid var(--border-glass)'
                                }}>
                                    <div style={{ marginBottom: '1rem' }}>
                                        {transaction.items?.map((item, idx) => (
                                            <div key={idx} className="flex-between" style={{ padding: '0.25rem 0' }}>
                                                <span>{item.product_name} x{item.quantity}</span>
                                                <span>{formatRupiah(item.subtotal)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{
                                        padding: '0.75rem',
                                        background: 'var(--bg-glass)',
                                        borderRadius: '8px'
                                    }}>
                                        <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
                                            <span>Subtotal</span>
                                            <span>{formatRupiah(transaction.subtotal)}</span>
                                        </div>
                                        {transaction.discount_amount > 0 && (
                                            <div className="flex-between" style={{ marginBottom: '0.25rem', color: 'var(--danger)' }}>
                                                <span>Diskon ({transaction.discount_code})</span>
                                                <span>-{formatRupiah(transaction.discount_amount)}</span>
                                            </div>
                                        )}
                                        <div className="flex-between" style={{ fontWeight: '600' }}>
                                            <span>Total</span>
                                            <span style={{ color: 'var(--primary)' }}>{formatRupiah(transaction.total)}</span>
                                        </div>
                                        <div className="flex-between" style={{ marginTop: '0.5rem' }}>
                                            <span>Bayar</span>
                                            <span>{formatRupiah(transaction.paid)}</span>
                                        </div>
                                        <div className="flex-between text-success">
                                            <span>Kembalian</span>
                                            <span style={{ fontWeight: '600' }}>{formatRupiah(transaction.change)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default HistoryPage
