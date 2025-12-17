import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

function ReportsPage() {
    const { authFetch, isAdmin } = useAuth()
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('daily')
    const [dailyReport, setDailyReport] = useState(null)
    const [monthlyReport, setMonthlyReport] = useState(null)
    const [bestSellers, setBestSellers] = useState(null)
    const [summary, setSummary] = useState(null)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

    useEffect(() => {
        if (isAdmin) {
            fetchReports()
        }
    }, [isAdmin])

    const fetchReports = async () => {
        try {
            const [summaryRes, dailyRes, monthlyRes, sellersRes] = await Promise.all([
                authFetch('/api/reports/summary'),
                authFetch(`/api/reports/daily?date=${selectedDate}`),
                authFetch('/api/reports/monthly'),
                authFetch('/api/reports/best-sellers')
            ])

            if (summaryRes.ok) setSummary(await summaryRes.json())
            if (dailyRes.ok) setDailyReport(await dailyRes.json())
            if (monthlyRes.ok) setMonthlyReport(await monthlyRes.json())
            if (sellersRes.ok) setBestSellers(await sellersRes.json())
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchDailyReport = async (date) => {
        try {
            const response = await authFetch(`/api/reports/daily?date=${date}`)
            if (response.ok) {
                setDailyReport(await response.json())
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value)
        fetchDailyReport(e.target.value)
    }

    const exportCSV = async (endpoint, filename) => {
        try {
            const response = await authFetch(endpoint)
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = filename
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
            } else {
                alert('Gagal export data')
            }
        } catch (error) {
            console.error('Error:', error)
            alert('Error saat export: ' + error.message)
        }
    }

    const formatRupiah = (amount) => `Rp ${amount?.toLocaleString('id-ID') || 0}`

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
        <div className="reports-page">
            <h2 className="page-title">📊 Laporan & Analitik</h2>

            {/* Summary Cards */}
            {summary && (
                <div className="reports-summary">
                    <div className="summary-card">
                        <div className="summary-label">Hari Ini</div>
                        <div className="summary-value success">{formatRupiah(summary.today.sales)}</div>
                        <div className="summary-sub">{summary.today.transactions} transaksi</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Bulan Ini</div>
                        <div className="summary-value primary">{formatRupiah(summary.this_month.sales)}</div>
                        <div className="summary-sub">{summary.this_month.transactions} transaksi</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Produk</div>
                        <div className="summary-value">{summary.products.total}</div>
                        <div className="summary-sub">{summary.products.low_stock} stok rendah</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Diskon Aktif</div>
                        <div className="summary-value warning">{summary.discounts.active}</div>
                        <div className="summary-sub">promo</div>
                    </div>
                </div>
            )}

            {/* Export Buttons */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ margin: 0 }}>📥 Export Data</h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => exportCSV('/api/export/products/csv', `produk_${new Date().toISOString().split('T')[0]}.csv`)}
                            className="btn btn-success btn-sm"
                        >
                            📦 Produk CSV
                        </button>
                        <button
                            onClick={() => exportCSV('/api/export/transactions/csv', `transaksi_${new Date().toISOString().split('T')[0]}.csv`)}
                            className="btn btn-primary btn-sm"
                        >
                            💰 Transaksi CSV
                        </button>
                        <button
                            onClick={() => exportCSV('/api/export/inventory/csv', `inventaris_${new Date().toISOString().split('T')[0]}.csv`)}
                            className="btn btn-warning btn-sm"
                        >
                            📊 Inventaris CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="report-tabs">
                {[
                    { id: 'daily', label: '📅 Harian' },
                    { id: 'monthly', label: '📆 Bulanan' },
                    { id: 'bestsellers', label: '🏆 Terlaris' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Daily Report */}
            {activeTab === 'daily' && dailyReport && (
                <div className="report-card">
                    <div className="report-header">
                        <h3>📅 Harian</h3>
                        <input
                            type="date"
                            className="form-input date-input"
                            value={selectedDate}
                            onChange={handleDateChange}
                        />
                    </div>

                    <div className="report-stats">
                        <div className="report-stat">
                            <div className="report-stat-value success">
                                {formatRupiah(dailyReport.summary.total_sales)}
                            </div>
                            <div className="report-stat-label">Penjualan</div>
                        </div>
                        <div className="report-stat">
                            <div className="report-stat-value">
                                {dailyReport.summary.total_transactions}
                            </div>
                            <div className="report-stat-label">Transaksi</div>
                        </div>
                        <div className="report-stat">
                            <div className="report-stat-value">
                                {dailyReport.summary.total_items_sold}
                            </div>
                            <div className="report-stat-label">Item</div>
                        </div>
                        <div className="report-stat">
                            <div className="report-stat-value danger">
                                {formatRupiah(dailyReport.summary.total_discount)}
                            </div>
                            <div className="report-stat-label">Diskon</div>
                        </div>
                    </div>

                    <h4 className="report-section-title">Metode Pembayaran</h4>
                    <div className="payment-list">
                        {Object.entries(dailyReport.payment_methods).map(([method, data]) => (
                            <div key={method} className="payment-item">
                                <span className="payment-icon">
                                    {method === 'cash' ? '💵' : method === 'qris' ? '📱' : '💳'}
                                </span>
                                <span className="payment-name">{method.toUpperCase()}</span>
                                <span className="payment-count">{data.count}x</span>
                                <span className="payment-total">{formatRupiah(data.total)}</span>
                            </div>
                        ))}
                    </div>

                    <h4 className="report-section-title">Penjualan per Jam</h4>
                    <div className="hourly-chart">
                        {Array.from({ length: 24 }).map((_, hour) => {
                            const data = dailyReport.hourly_sales[hour]
                            const maxSales = Math.max(...Object.values(dailyReport.hourly_sales).map(d => d?.total || 0), 1)
                            const height = data ? (data.total / maxSales * 100) : 2
                            return (
                                <div
                                    key={hour}
                                    className="hourly-bar"
                                    style={{ height: `${height}%` }}
                                    title={`${hour}:00 - ${data ? formatRupiah(data.total) : 'Rp 0'}`}
                                />
                            )
                        })}
                    </div>
                    <div className="hourly-labels">
                        <span>00</span>
                        <span>06</span>
                        <span>12</span>
                        <span>18</span>
                        <span>23</span>
                    </div>
                </div>
            )}

            {/* Monthly Report */}
            {activeTab === 'monthly' && monthlyReport && (
                <div className="report-card">
                    <h3 className="report-title">📆 {monthlyReport.month}/{monthlyReport.year}</h3>

                    <div className="report-stats three-cols">
                        <div className="report-stat">
                            <div className="report-stat-value success">
                                {formatRupiah(monthlyReport.summary.total_sales)}
                            </div>
                            <div className="report-stat-label">Total Penjualan</div>
                        </div>
                        <div className="report-stat">
                            <div className="report-stat-value">
                                {monthlyReport.summary.total_transactions}
                            </div>
                            <div className="report-stat-label">Transaksi</div>
                        </div>
                        <div className="report-stat">
                            <div className="report-stat-value primary">
                                {formatRupiah(monthlyReport.summary.average_daily)}
                            </div>
                            <div className="report-stat-label">Rata-rata/Hari</div>
                        </div>
                    </div>

                    <h4 className="report-section-title">Metode Pembayaran</h4>
                    <div className="payment-list">
                        {Object.entries(monthlyReport.payment_methods).map(([method, data]) => (
                            <div key={method} className="payment-item">
                                <span className="payment-icon">
                                    {method === 'cash' ? '💵' : method === 'qris' ? '📱' : '💳'}
                                </span>
                                <span className="payment-name">{method.toUpperCase()}</span>
                                <span className="payment-count">{data.count}x</span>
                                <span className="payment-total">{formatRupiah(data.total)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Best Sellers */}
            {activeTab === 'bestsellers' && bestSellers && (
                <div className="report-card">
                    <h3 className="report-title">🏆 Terlaris (30 Hari)</h3>

                    <div className="bestseller-list">
                        {bestSellers.best_sellers.map((product, index) => (
                            <div key={product.product_id} className="bestseller-item">
                                <span className={`bestseller-rank ${index < 3 ? 'top' : ''}`}>
                                    #{index + 1}
                                </span>
                                <span className="bestseller-emoji">{product.emoji}</span>
                                <div className="bestseller-info">
                                    <div className="bestseller-name">{product.product_name}</div>
                                    <div className="bestseller-stock">Stok: {product.current_stock}</div>
                                </div>
                                <div className="bestseller-stats">
                                    <div className="bestseller-qty">{product.total_quantity} terjual</div>
                                    <div className="bestseller-revenue">{formatRupiah(product.total_revenue)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default ReportsPage
