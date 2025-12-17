import { useState } from 'react'

function CheckoutModal({ cart, cartTotal, discount, onClose, onComplete, authFetch }) {
    const [paid, setPaid] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [promoCode, setPromoCode] = useState('')
    const [appliedDiscount, setAppliedDiscount] = useState(discount)
    const [promoError, setPromoError] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [receipt, setReceipt] = useState(null)

    const discountAmount = appliedDiscount ?
        (appliedDiscount.discount_type === 'percentage'
            ? Math.min(Math.floor(cartTotal * appliedDiscount.value / 100), appliedDiscount.max_discount || Infinity)
            : Math.min(appliedDiscount.value, cartTotal)
        ) : 0

    const finalTotal = cartTotal - discountAmount
    const paidAmount = parseInt(paid) || 0
    const change = paidAmount - finalTotal
    const canPay = paymentMethod !== 'cash' || paidAmount >= finalTotal

    const formatRupiah = (amount) => `Rp ${amount.toLocaleString('id-ID')}`

    const paymentMethods = [
        { id: 'cash', label: '💵 Cash', icon: '💵' },
        { id: 'qris', label: '📱 QRIS', icon: '📱' },
        { id: 'debit', label: '💳 Debit', icon: '💳' },
        { id: 'credit', label: '💳 Credit', icon: '💳' },
    ]

    const quickPayAmounts = [20000, 50000, 100000, 150000, 200000]

    const applyPromo = async () => {
        if (!promoCode) return
        setPromoError('')

        try {
            const response = await fetch(`/api/discounts/validate/${promoCode}?subtotal=${cartTotal}`)
            if (response.ok) {
                const data = await response.json()
                setAppliedDiscount(data.discount)
            } else {
                const error = await response.json()
                setPromoError(error.detail)
            }
        } catch (error) {
            setPromoError('Gagal memvalidasi promo')
        }
    }

    const handlePayment = async () => {
        if (!canPay) return

        setIsProcessing(true)
        try {
            const finalPaid = paymentMethod === 'cash' ? paidAmount : finalTotal

            const response = await authFetch('/api/transactions', {
                method: 'POST',
                body: JSON.stringify({
                    items: cart.map(item => ({
                        product_id: item.id,
                        quantity: item.quantity
                    })),
                    discount_code: appliedDiscount?.code || null,
                    payment_method: paymentMethod,
                    paid: finalPaid
                })
            })

            if (response.ok) {
                const data = await response.json()
                setReceipt(data)
            } else {
                const error = await response.json()
                throw new Error(error.detail)
            }
        } catch (error) {
            alert('Gagal memproses: ' + error.message)
        } finally {
            setIsProcessing(false)
        }
    }

    const handlePrint = () => window.print()

    const handleDone = () => {
        onComplete()
        onClose()
    }

    // Receipt View
    if (receipt) {
        return (
            <div className="modal-overlay">
                <div className="modal" style={{ maxWidth: '420px' }}>
                    <div className="modal-header">
                        <h2>✅ Pembayaran Berhasil</h2>
                        <button className="modal-close" onClick={handleDone}>×</button>
                    </div>
                    <div className="modal-body">
                        <div className="receipt">
                            <div className="receipt-header">
                                <div className="receipt-logo">🛒</div>
                                <div className="receipt-store-name">TOKO MAKANAN</div>
                                <div className="receipt-date">
                                    {new Date(receipt.created_at).toLocaleString('id-ID')}
                                </div>
                                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                                    No: #{receipt.id.toString().padStart(6, '0')}
                                </div>
                            </div>

                            <hr className="receipt-divider" />

                            <div className="receipt-items">
                                {receipt.items.map((item, idx) => (
                                    <div key={idx} className="receipt-item">
                                        <span className="receipt-item-name">{item.product_name}</span>
                                        <span className="receipt-item-qty">x{item.quantity}</span>
                                        <span>{formatRupiah(item.subtotal)}</span>
                                    </div>
                                ))}
                            </div>

                            <hr className="receipt-divider" />

                            <div className="receipt-totals">
                                <div className="receipt-total-row">
                                    <span>Subtotal</span>
                                    <span>{formatRupiah(receipt.subtotal)}</span>
                                </div>
                                {receipt.discount_amount > 0 && (
                                    <div className="receipt-total-row" style={{ color: '#e74c3c' }}>
                                        <span>Diskon ({receipt.discount_code})</span>
                                        <span>-{formatRupiah(receipt.discount_amount)}</span>
                                    </div>
                                )}
                                <div className="receipt-total-row grand-total">
                                    <span>Total</span>
                                    <span>{formatRupiah(receipt.total)}</span>
                                </div>
                                <div className="receipt-total-row">
                                    <span>Bayar ({receipt.payment_method.toUpperCase()})</span>
                                    <span>{formatRupiah(receipt.paid)}</span>
                                </div>
                                <div className="receipt-total-row" style={{ color: '#27ae60', fontWeight: 'bold' }}>
                                    <span>Kembalian</span>
                                    <span>{formatRupiah(receipt.change)}</span>
                                </div>
                            </div>

                            <div className="receipt-footer">
                                <p className="receipt-thanks">Terima Kasih! 🙏</p>
                                <p>Selamat Menikmati</p>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={handlePrint}>🖨️ Print</button>
                        <button className="btn btn-success" onClick={handleDone}>✓ Selesai</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h2>💰 Pembayaran</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Order Summary */}
                    <div className="checkout-summary">
                        <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            Ringkasan ({cart.length} item)
                        </h4>
                        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                            {cart.map(item => (
                                <div key={item.id} className="checkout-row">
                                    <span>{item.emoji} {item.name} x{item.quantity}</span>
                                    <span>{formatRupiah(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="checkout-row total">
                            <span>Subtotal</span>
                            <span>{formatRupiah(cartTotal)}</span>
                        </div>
                    </div>

                    {/* Promo Code */}
                    <div className="form-group">
                        <label className="form-label">Kode Promo</label>
                        <div className="flex gap-sm">
                            <input
                                type="text"
                                className="form-input"
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                placeholder="Masukkan kode promo"
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={applyPromo}
                            >
                                Pakai
                            </button>
                        </div>
                        {promoError && <small className="text-danger">{promoError}</small>}
                        {appliedDiscount && (
                            <div style={{
                                marginTop: '0.5rem',
                                padding: '0.5rem',
                                background: 'rgba(39, 174, 96, 0.2)',
                                borderRadius: '8px',
                                color: 'var(--success)'
                            }}>
                                ✅ {appliedDiscount.name} (-{appliedDiscount.discount_type === 'percentage'
                                    ? `${appliedDiscount.value}%`
                                    : formatRupiah(appliedDiscount.value)})
                            </div>
                        )}
                    </div>

                    {/* Payment Method */}
                    <div className="form-group">
                        <label className="form-label">Metode Pembayaran</label>
                        <div className="payment-methods">
                            {paymentMethods.map(method => (
                                <button
                                    key={method.id}
                                    type="button"
                                    className={`payment-method-btn ${paymentMethod === method.id ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod(method.id)}
                                >
                                    {method.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cash Input (only for cash) */}
                    {paymentMethod === 'cash' && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Jumlah Bayar</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={paid}
                                    onChange={(e) => setPaid(e.target.value)}
                                    placeholder="Masukkan jumlah uang"
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                {quickPayAmounts.map(amount => (
                                    <button
                                        key={amount}
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setPaid(amount.toString())}
                                    >
                                        {formatRupiah(amount)}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => setPaid(finalTotal.toString())}
                                >
                                    Uang Pas
                                </button>
                            </div>
                        </>
                    )}

                    {/* Final Summary */}
                    <div className="checkout-summary">
                        {discountAmount > 0 && (
                            <div className="checkout-row" style={{ color: 'var(--danger)' }}>
                                <span>Diskon</span>
                                <span>-{formatRupiah(discountAmount)}</span>
                            </div>
                        )}
                        <div className="checkout-row total">
                            <span>Total Bayar</span>
                            <span className="amount">{formatRupiah(finalTotal)}</span>
                        </div>
                        {paymentMethod === 'cash' && paidAmount > 0 && (
                            <div className={`checkout-row ${change >= 0 ? 'change' : ''}`}>
                                <span>Kembalian</span>
                                <span style={{ color: change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                    {change >= 0 ? formatRupiah(change) : `Kurang ${formatRupiah(-change)}`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Batal</button>
                    <button
                        className="btn btn-success"
                        onClick={handlePayment}
                        disabled={!canPay || isProcessing}
                    >
                        {isProcessing ? '⏳ Memproses...' : '✓ Konfirmasi Bayar'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CheckoutModal
