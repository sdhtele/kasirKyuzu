function Cart({ cart, cartTotal, cartCount, updateQuantity, clearCart, onCheckout }) {
    const formatRupiah = (amount) => `Rp ${amount.toLocaleString('id-ID')}`

    return (
        <div className="cart-section">
            <div className="cart-header">
                <h2>
                    🛒 Keranjang
                    {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                </h2>
            </div>

            <div className="cart-items">
                {cart.length === 0 ? (
                    <div className="cart-empty">
                        <span className="cart-empty-icon">🛒</span>
                        <p>Keranjang masih kosong</p>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Scan barcode atau pilih produk
                        </span>
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={item.id} className="cart-item">
                            <span className="cart-item-emoji">{item.emoji}</span>
                            <div className="cart-item-info">
                                <div className="cart-item-name">{item.name}</div>
                                <div className="cart-item-price">{formatRupiah(item.price)}</div>
                            </div>
                            <div className="cart-item-controls">
                                <button
                                    className="qty-btn"
                                    onClick={() => updateQuantity(item.id, -1)}
                                >
                                    −
                                </button>
                                <span className="cart-item-qty">{item.quantity}</span>
                                <button
                                    className="qty-btn"
                                    onClick={() => updateQuantity(item.id, 1)}
                                >
                                    +
                                </button>
                            </div>
                            <span className="cart-item-subtotal">
                                {formatRupiah(item.price * item.quantity)}
                            </span>
                        </div>
                    ))
                )}
            </div>

            <div className="cart-footer">
                <div className="cart-total">
                    <span className="cart-total-label">Total</span>
                    <span className="cart-total-amount">{formatRupiah(cartTotal)}</span>
                </div>
                <div className="cart-actions">
                    <button
                        className="btn btn-ghost"
                        onClick={clearCart}
                        disabled={cart.length === 0}
                    >
                        🗑️ Clear
                    </button>
                    <button
                        className="btn btn-success btn-lg"
                        onClick={onCheckout}
                        disabled={cart.length === 0}
                    >
                        💰 Bayar
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Cart
