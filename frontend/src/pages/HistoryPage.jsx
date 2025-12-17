import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

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

    if (loading) {
        return <div className="flex-center" style={{ height: '50vh' }}><div className="spinner"></div></div>
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>📋 Riwayat Transaksi</h2>

            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>
                        {totalTransactions}
                    </div>
                    <div className="text-muted">Total Transaksi</div>
                </div>
                <div className="glass-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)' }}>
                        {formatRupiah(totalRevenue)}
                    </div>
                    <div className="text-muted">Total Pendapatan</div>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card mb-lg">
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Metode Pembayaran</label>
                        <select
                            className="form-input"
                            value={filter.payment_method}
                            onChange={(e) => setFilter({ ...filter, payment_method: e.target.value })}
                            style={{ minWidth: '150px' }}
                        >
                            <option value="">Semua</option>
                            <option value="cash">Cash</option>
                            <option value="qris">QRIS</option>
                            <option value="debit">Debit</option>
                            <option value="credit">Credit</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Dari Tanggal</label>
                        <input
                            type="date"
                            className="form-input"
                            value={filter.date_from}
                            onChange={(e) => setFilter({ ...filter, date_from: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Sampai Tanggal</label>
                        <input
                            type="date"
                            className="form-input"
                            value={filter.date_to}
                            onChange={(e) => setFilter({ ...filter, date_to: e.target.value })}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={fetchTransactions}>
                        🔍 Filter
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => {
                            setFilter({ payment_method: '', date_from: '', date_to: '' })
                            setTimeout(fetchTransactions, 100)
                        }}
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
