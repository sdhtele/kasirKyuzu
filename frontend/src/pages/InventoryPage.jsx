import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

function InventoryPage() {
    const { authFetch, isAdmin } = useAuth()
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [adjustQuantity, setAdjustQuantity] = useState('')
    const [adjustReason, setAdjustReason] = useState('')
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products')
            const data = await response.json()
            setProducts(data)
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatRupiah = (amount) => `Rp ${amount.toLocaleString('id-ID')}`

    const filteredProducts = products.filter(p => {
        if (filter === 'low') return p.stock > 0 && p.stock <= 5
        if (filter === 'out') return p.stock === 0
        return true
    })

    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 5).length
    const outOfStockCount = products.filter(p => p.stock === 0).length
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0)

    const handleAdjust = (product) => {
        setSelectedProduct(product)
        setAdjustQuantity('')
        setAdjustReason('')
        setShowAdjustModal(true)
    }

    const submitAdjustment = async () => {
        if (!adjustQuantity) return

        try {
            const response = await authFetch(`/api/products/${selectedProduct.id}/stock`, {
                method: 'PUT',
                body: JSON.stringify({
                    quantity: parseInt(adjustQuantity),
                    reason: adjustReason
                })
            })

            if (response.ok) {
                fetchProducts()
                setShowAdjustModal(false)
            } else {
                const error = await response.json()
                alert(error.detail)
            }
        } catch (error) {
            alert('Error: ' + error.message)
        }
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
        <div className="inventory-page">
            <h2 className="page-title">📦 Manajemen Stok</h2>

            {/* Stats Cards */}
            <div className="inventory-stats">
                <div className="stat-card">
                    <div className="stat-value primary">{products.length}</div>
                    <div className="stat-label">Total Produk</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value success">{totalStock}</div>
                    <div className="stat-label">Total Stok</div>
                </div>
                <div className="stat-card" onClick={() => setFilter('low')}>
                    <div className="stat-value warning">{lowStockCount}</div>
                    <div className="stat-label">Stok Rendah</div>
                </div>
                <div className="stat-card" onClick={() => setFilter('out')}>
                    <div className="stat-value danger">{outOfStockCount}</div>
                    <div className="stat-label">Stok Habis</div>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockCount > 0 && (
                <div className="alert-warning">
                    <strong>⚠️ Peringatan:</strong> {lowStockCount} produk stok rendah
                </div>
            )}

            {/* Filter Buttons */}
            <div className="filter-buttons">
                {[
                    { id: 'all', label: 'Semua' },
                    { id: 'low', label: '⚠️ Rendah' },
                    { id: 'out', label: '🚫 Habis' }
                ].map(f => (
                    <button
                        key={f.id}
                        className={`btn ${filter === f.id ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                        onClick={() => setFilter(f.id)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Products List - Mobile Friendly */}
            <div className="inventory-list">
                {filteredProducts.map(product => (
                    <div key={product.id} className="inventory-item">
                        <div className="inventory-item-main">
                            {product.image_url ? (
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="inventory-image"
                                    style={{
                                        width: '50px',
                                        height: '50px',
                                        objectFit: 'cover',
                                        borderRadius: '8px'
                                    }}
                                />
                            ) : (
                                <span className="inventory-emoji">{product.emoji}</span>
                            )}
                            <div className="inventory-info">
                                <div className="inventory-name">{product.name}</div>
                                <div className="inventory-meta">
                                    {product.category} • {formatRupiah(product.price)}
                                </div>
                            </div>
                        </div>
                        <div className="inventory-item-right">
                            <div className="inventory-stock">
                                <span className={`stock-value ${product.stock === 0 ? 'danger' :
                                    product.stock <= 5 ? 'warning' : 'success'
                                    }`}>
                                    {product.stock}
                                </span>
                                <span className="stock-label">stok</span>
                            </div>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleAdjust(product)}
                            >
                                ±
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Adjust Modal */}
            {showAdjustModal && selectedProduct && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>± Sesuaikan Stok</h2>
                            <button className="modal-close" onClick={() => setShowAdjustModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="adjust-product">
                                {selectedProduct.image_url ? (
                                    <img
                                        src={selectedProduct.image_url}
                                        alt={selectedProduct.name}
                                        style={{
                                            width: '60px',
                                            height: '60px',
                                            objectFit: 'cover',
                                            borderRadius: '8px'
                                        }}
                                    />
                                ) : (
                                    <span className="adjust-emoji">{selectedProduct.emoji}</span>
                                )}
                                <div>
                                    <h4>{selectedProduct.name}</h4>
                                    <p className="text-muted">Stok saat ini: <strong>{selectedProduct.stock}</strong></p>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Jumlah Penyesuaian</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={adjustQuantity}
                                    onChange={(e) => setAdjustQuantity(e.target.value)}
                                    placeholder="+10 atau -5"
                                />
                                <small className="text-muted">
                                    (+) tambah, (-) kurang
                                </small>
                            </div>

                            {adjustQuantity && (
                                <div className="adjust-preview">
                                    <div className="adjust-row">
                                        <span>Saat ini</span>
                                        <span>{selectedProduct.stock}</span>
                                    </div>
                                    <div className="adjust-row">
                                        <span>Perubahan</span>
                                        <span className={parseInt(adjustQuantity) >= 0 ? 'success' : 'danger'}>
                                            {parseInt(adjustQuantity) >= 0 ? '+' : ''}{adjustQuantity}
                                        </span>
                                    </div>
                                    <div className="adjust-row total">
                                        <span>Stok Baru</span>
                                        <span>{selectedProduct.stock + parseInt(adjustQuantity || 0)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Alasan (Opsional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    placeholder="Restock, dll"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowAdjustModal(false)}>Batal</button>
                            <button
                                className="btn btn-success"
                                onClick={submitAdjustment}
                                disabled={!adjustQuantity || (selectedProduct.stock + parseInt(adjustQuantity)) < 0}
                            >
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default InventoryPage
