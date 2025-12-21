import { useState, useEffect } from 'react'
import BarcodeScanner from '../components/BarcodeScanner'
import Cart from '../components/Cart'
import CheckoutModal from '../components/CheckoutModal'
import { useAuth } from '../context/AuthContext'

function CashierPage({ products, cart, cartTotal, cartCount, addToCart, updateQuantity, clearCart, fetchProducts }) {
    const { authFetch } = useAuth()
    const [isScanning, setIsScanning] = useState(false)
    const [scanStatus, setScanStatus] = useState(null)
    const [showCheckout, setShowCheckout] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState('Semua')

    // Get unique categories
    const categories = ['Semua', ...new Set(products.map(p => p.category))]

    // Filter products
    const filteredProducts = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.barcode && p.barcode.includes(searchQuery))
        const matchCategory = activeCategory === 'Semua' || p.category === activeCategory
        return matchSearch && matchCategory
    })

    const handleScan = async (barcode) => {
        try {
            const response = await fetch(`/api/products/barcode/${barcode}`)
            if (response.ok) {
                const product = await response.json()
                if (product.stock <= 0) {
                    showStatus('error', `❌ Stok ${product.name} habis!`)
                    return
                }
                addToCart(product)
                showStatus('success', `✅ ${product.name} ditambahkan!`)
            } else {
                showStatus('error', '❌ Produk tidak ditemukan')
            }
        } catch (error) {
            showStatus('error', '❌ Error saat scan')
        }
    }

    const showStatus = (type, message) => {
        setScanStatus({ type, message })
        setTimeout(() => setScanStatus(null), 2000)
    }

    const handleAddToCart = (product) => {
        if (product.stock <= 0) {
            showStatus('error', `❌ Stok ${product.name} habis!`)
            return
        }
        addToCart(product)
        showStatus('success', `✅ ${product.name}`)
    }

    const handleCheckoutComplete = () => {
        clearCart()
        fetchProducts()
    }

    const formatRupiah = (amount) => `Rp ${amount.toLocaleString('id-ID')}`

    return (
        <div className="cashier-page">
            {/* Left Panel - Products */}
            <div className="cashier-products-panel">
                {/* Header with Search */}
                <div className="cashier-header">
                    <div className="cashier-search">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Cari produk atau scan barcode..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="cashier-search-input"
                        />
                    </div>
                    <button
                        className={`btn-scan ${isScanning ? 'active' : ''}`}
                        onClick={() => setIsScanning(!isScanning)}
                    >
                        📷 {isScanning ? 'Stop' : 'Scan'}
                    </button>
                </div>



                {/* Status Toast */}
                {scanStatus && (
                    <div className={`status-toast ${scanStatus.type}`}>
                        {scanStatus.message}
                    </div>
                )}

                {/* Category Tabs */}
                <div className="category-tabs">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Products Grid */}
                <div className="products-grid">
                    {filteredProducts.map(product => (
                        <div
                            key={product.id}
                            className={`product-card ${product.stock <= 0 ? 'out-of-stock' : ''}`}
                            onClick={() => handleAddToCart(product)}
                        >
                            {/* Product Image or Emoji */}
                            <div className="product-card-image">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} />
                                ) : (
                                    <span className="product-emoji">{product.emoji}</span>
                                )}
                                {product.stock <= 5 && product.stock > 0 && (
                                    <span className="stock-warning">⚠️ {product.stock}</span>
                                )}
                                {product.stock <= 0 && (
                                    <span className="stock-empty">Habis</span>
                                )}
                            </div>
                            <div className="product-card-info">
                                <span className="product-card-name">{product.name}</span>
                                <span className="product-card-price">{formatRupiah(product.price)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel - Cart */}
            <div className="cashier-cart-panel">
                <div className="cart-header">
                    <h2>🛒 Keranjang</h2>
                    <span className="cart-count">{cartCount} item</span>
                </div>

                {/* Cart Items */}
                <div className="cart-items">
                    {cart.length === 0 ? (
                        <div className="cart-empty">
                            <span className="cart-empty-icon">🛒</span>
                            <p>Keranjang kosong</p>
                            <small>Klik produk untuk menambahkan</small>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="cart-item">
                                <div className="cart-item-info">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="cart-item-img" />
                                    ) : (
                                        <span className="cart-item-emoji">{item.emoji}</span>
                                    )}
                                    <div>
                                        <div className="cart-item-name">{item.name}</div>
                                        <div className="cart-item-price">{formatRupiah(item.price)}</div>
                                    </div>
                                </div>
                                <div className="cart-item-qty">
                                    <button
                                        className="qty-btn"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    >
                                        −
                                    </button>
                                    <span className="qty-value">{item.quantity}</span>
                                    <button
                                        className="qty-btn"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="cart-item-subtotal">
                                    {formatRupiah(item.price * item.quantity)}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Cart Footer */}
                <div className="cart-footer">
                    <div className="cart-total">
                        <span>Total</span>
                        <span className="cart-total-amount">{formatRupiah(cartTotal)}</span>
                    </div>

                    <div className="cart-actions">
                        {cart.length > 0 && (
                            <button className="btn-clear" onClick={clearCart}>
                                🗑️ Hapus
                            </button>
                        )}
                        <button
                            className="btn-checkout"
                            onClick={() => setShowCheckout(true)}
                            disabled={cart.length === 0}
                        >
                            💳 Bayar
                        </button>
                    </div>
                </div>
            </div>

            {/* Scanner Modal */}
            {
                isScanning && (
                    <div className="modal-overlay" onClick={() => setIsScanning(false)}>
                        <div className="modal scanner-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>📷 Scan Barcode</h3>
                                <button
                                    className="btn-close"
                                    onClick={() => setIsScanning(false)}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="modal-body">
                                <BarcodeScanner
                                    onScan={handleScan}
                                    isScanning={isScanning}
                                    setIsScanning={setIsScanning}
                                />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Checkout Modal */}
            {
                showCheckout && (
                    <CheckoutModal
                        cart={cart}
                        cartTotal={cartTotal}
                        onClose={() => setShowCheckout(false)}
                        onComplete={handleCheckoutComplete}
                        authFetch={authFetch}
                    />
                )
            }
        </div >
    )
}

export default CashierPage
