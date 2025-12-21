import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { BrowserMultiFormatReader } from '@zxing/library'

function AdminPage({ products, onProductsChange }) {
    const { authFetch, isAdmin } = useAuth()
    const [showForm, setShowForm] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [barcodeImage, setBarcodeImage] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [uploading, setUploading] = useState(false)
    const [showScanner, setShowScanner] = useState(false)
    const [scannerStatus, setScannerStatus] = useState('')
    const [showBarcodeModal, setShowBarcodeModal] = useState(null) // product for barcode management
    const [productBarcodes, setProductBarcodes] = useState([])
    const [newBarcodeInput, setNewBarcodeInput] = useState('')
    const [newBarcodeDesc, setNewBarcodeDesc] = useState('')
    const [pendingImageFile, setPendingImageFile] = useState(null) // for new product image upload
    const [previewUrl, setPreviewUrl] = useState(null) // preview before save
    const fileInputRef = useRef(null)
    const videoRef = useRef(null)
    const readerRef = useRef(null)
    const [customCategory, setCustomCategory] = useState('')
    const [formData, setFormData] = useState({
        barcode: '',
        name: '',
        price: '',
        cost_price: '',
        stock: '',
        min_stock: '5',
        category: 'Makanan',
        emoji: '🍽️'
    })

    const formatRupiah = (amount) => `Rp ${amount.toLocaleString('id-ID')}`

    const emojiOptions = [
        '🍛', '🍜', '🍲', '🍵', '🧊', '🍊', '☕', '💧', '🍔', '🍕', '🌮', '🥤', '🍰', '🍩', '🍗', '🍟', '🍘',
        '🥛', '🍞', '🧈', '🥚', '🧀', '🥩', '🍖', '🐟', '🥬', '🥕', '🧅', '🍎', '🍌', '🍇', '🍫', '🍬', '🍪',
        '🧴', '🧻', '🧹', '🪥', '🧽', '💊', '🩹', '📱', '🔌', '💡', '🔋', '📦', '🛒', '🏷️', '💵', '🎁'
    ]
    const categories = [
        'Makanan',
        'Minuman',
        'Snack',
        'Sembako',
        'Bumbu Dapur',
        'Frozen Food',
        'Roti & Kue',
        'Susu & Dairy',
        'Mie Instan',
        'Kebutuhan Bayi',
        'Perawatan Tubuh',
        'Kosmetik',
        'Skincare',
        'Kebersihan Rumah',
        'Obat & Kesehatan',
        'Rokok',
        'ATK',
        'Elektronik',
        'Aksesoris',
        'Lainnya'
    ]

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery))
    )

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            const url = selectedProduct
                ? `/api/products/${selectedProduct.id}`
                : '/api/products'

            const response = await authFetch(url, {
                method: selectedProduct ? 'PUT' : 'POST',
                body: JSON.stringify({
                    barcode: formData.barcode || null,
                    name: formData.name,
                    price: parseInt(formData.price),
                    cost_price: parseInt(formData.cost_price) || 0,
                    stock: parseInt(formData.stock) || 0,
                    min_stock: parseInt(formData.min_stock) || 5,
                    category: formData.category,
                    emoji: formData.emoji
                })
            })

            if (response.ok) {
                const result = await response.json()

                // Auto-upload pending image for new products
                if (!selectedProduct && pendingImageFile && result.id) {
                    await handleImageUpload(result.id, pendingImageFile)
                }

                onProductsChange()
                resetForm()
            } else {
                const error = await response.json()
                alert(error.detail)
            }
        } catch (error) {
            alert('Error: ' + error.message)
        }
    }

    const handleDelete = async (productId) => {
        if (!confirm('Hapus produk ini?')) return

        try {
            const response = await authFetch(`/api/products/${productId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                onProductsChange()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    // ============ BARCODE MANAGEMENT ============
    const [batchScanMode, setBatchScanMode] = useState(false)
    const [usbScanMode, setUsbScanMode] = useState(false)
    const [scannedBarcodes, setScannedBarcodes] = useState([])
    const scanBarcodeReaderRef = useRef(null)
    const scanVideoRef = useRef(null)
    const usbBufferRef = useRef('')
    const usbTimeoutRef = useRef(null)

    const openBarcodeModal = async (product) => {
        setShowBarcodeModal(product)
        setNewBarcodeInput('')
        setNewBarcodeDesc('')
        setBatchScanMode(false)
        setUsbScanMode(false)
        setScannedBarcodes([])
        // Load all barcodes for this product
        try {
            const response = await authFetch(`/api/products/${product.id}/barcodes`)
            if (response.ok) {
                const data = await response.json()
                setProductBarcodes(data)
            }
        } catch (error) {
            console.error('Error loading barcodes:', error)
        }
    }

    // USB Scanner - keyboard listener
    useEffect(() => {
        if (!usbScanMode || !showBarcodeModal) return

        const handleKeyDown = (e) => {
            // Clear any existing timeout
            if (usbTimeoutRef.current) {
                clearTimeout(usbTimeoutRef.current)
            }

            // Enter key = process the barcode
            if (e.key === 'Enter' && usbBufferRef.current.length > 3) {
                e.preventDefault()
                const barcode = usbBufferRef.current
                usbBufferRef.current = ''
                addBarcodeFromScan(barcode)
                return
            }

            // Ignore non-printable keys
            if (e.key.length !== 1) return

            // Add to buffer
            usbBufferRef.current += e.key

            // Auto-process after 100ms of no input (scanner is done)
            usbTimeoutRef.current = setTimeout(() => {
                if (usbBufferRef.current.length > 3) {
                    const barcode = usbBufferRef.current
                    usbBufferRef.current = ''
                    addBarcodeFromScan(barcode)
                }
            }, 100)
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            if (usbTimeoutRef.current) clearTimeout(usbTimeoutRef.current)
        }
    }, [usbScanMode, showBarcodeModal])

    // Add barcode directly from scan (auto-add)
    const modalProductRef = useRef(null)
    const lastBatchScanRef = useRef('')
    const lastBatchScanTimeRef = useRef(0)

    // Update ref when modal changes
    useEffect(() => {
        modalProductRef.current = showBarcodeModal
    }, [showBarcodeModal])

    // Cleanup scanner when modal closes
    useEffect(() => {
        if (!showBarcodeModal && scanBarcodeReaderRef.current) {
            scanBarcodeReaderRef.current.reset()
            setBatchScanMode(false)
            setUsbScanMode(false)
        }
    }, [showBarcodeModal])

    const addBarcodeFromScan = async (barcode) => {
        const product = modalProductRef.current
        if (!product) return

        // Debounce - prevent same barcode within 1 second
        const now = Date.now()
        if (barcode === lastBatchScanRef.current && now - lastBatchScanTimeRef.current < 1000) {
            return
        }
        lastBatchScanRef.current = barcode
        lastBatchScanTimeRef.current = now

        try {
            const response = await authFetch(`/api/products/${product.id}/barcodes`, {
                method: 'POST',
                body: JSON.stringify({
                    barcode: barcode,
                    description: 'Dari batch scan'
                })
            })

            if (response.ok) {
                setScannedBarcodes(prev => [...prev, barcode])
                // Reload barcodes
                const refreshResp = await authFetch(`/api/products/${product.id}/barcodes`)
                if (refreshResp.ok) {
                    const data = await refreshResp.json()
                    setProductBarcodes(data)
                }
                onProductsChange()

                // Play success sound
                try {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)()
                    const osc = ctx.createOscillator()
                    const gain = ctx.createGain()
                    osc.connect(gain)
                    gain.connect(ctx.destination)
                    osc.frequency.value = 1000
                    gain.gain.value = 0.3
                    osc.start()
                    osc.stop(ctx.currentTime + 0.15)
                } catch (e) { }
            } else {
                // Already exists - play different sound
                try {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)()
                    const osc = ctx.createOscillator()
                    osc.connect(ctx.destination)
                    osc.frequency.value = 400
                    osc.start()
                    osc.stop(ctx.currentTime + 0.1)
                } catch (e) { }
            }
        } catch (error) {
            console.error('Error adding barcode:', error)
        }
    }

    const addBarcodeAlias = async () => {
        if (!newBarcodeInput.trim() || !showBarcodeModal) return

        try {
            const response = await authFetch(`/api/products/${showBarcodeModal.id}/barcodes`, {
                method: 'POST',
                body: JSON.stringify({
                    barcode: newBarcodeInput.trim(),
                    description: newBarcodeDesc.trim() || null
                })
            })

            if (response.ok) {
                // Reload barcodes
                openBarcodeModal(showBarcodeModal)
                setNewBarcodeInput('')
                setNewBarcodeDesc('')
                onProductsChange() // Refresh product list
            } else {
                const error = await response.json()
                alert(error.detail)
            }
        } catch (error) {
            alert('Error: ' + error.message)
        }
    }

    const deleteBarcodeAlias = async (barcodeId) => {
        if (!showBarcodeModal) return

        try {
            const response = await authFetch(`/api/products/${showBarcodeModal.id}/barcodes/${barcodeId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                openBarcodeModal(showBarcodeModal)
                onProductsChange()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleEdit = (product) => {
        setSelectedProduct(product)
        // Check if category is custom (not in predefined list)
        if (!categories.includes(product.category)) {
            setCustomCategory(product.category)
        } else {
            setCustomCategory('')
        }
        setFormData({
            barcode: product.barcode || '',
            name: product.name,
            price: product.price.toString(),
            cost_price: (product.cost_price || 0).toString(),
            stock: product.stock.toString(),
            min_stock: (product.min_stock || 5).toString(),
            category: product.category,
            emoji: product.emoji
        })
        setShowForm(true)
    }

    const resetForm = () => {
        setShowForm(false)
        setSelectedProduct(null)
        setCustomCategory('')
        setFormData({
            barcode: '',
            name: '',
            price: '',
            cost_price: '',
            stock: '',
            min_stock: '5',
            category: 'Makanan',
            emoji: '🍽️'
        })
    }

    const showBarcode = async (product) => {
        setBarcodeImage({
            product,
            imageUrl: `/api/products/${product.id}/barcode-image`
        })
    }

    const printBarcode = () => {
        if (!barcodeImage) return
        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
      <html>
        <head>
          <title>Barcode - ${barcodeImage.product.name}</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 20px; }
            .barcode-container { display: inline-block; border: 2px solid #333; padding: 15px; margin: 10px; }
            img { max-width: 250px; height: auto; }
            h3 { margin: 10px 0 5px; }
            p { margin: 0; color: #666; }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <img src="${barcodeImage.imageUrl}" />
            <h3>${barcodeImage.product.emoji} ${barcodeImage.product.name}</h3>
            <p>Rp ${barcodeImage.product.price.toLocaleString('id-ID')}</p>
            ${barcodeImage.product.barcode ? `<p style="font-size: 12px; margin-top: 5px;">${barcodeImage.product.barcode}</p>` : ''}
          </div>
        </body>
      </html>
    `)
        printWindow.document.close()
        setTimeout(() => printWindow.print(), 250)
    }

    // Handle image upload
    const handleImageUpload = async (productId, file) => {
        if (!file) return

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const token = localStorage.getItem('token')
            const response = await fetch(`/api/products/${productId}/upload-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (response.ok) {
                onProductsChange()
                alert('Gambar berhasil diupload!')
            } else {
                const error = await response.json()
                alert(error.detail || 'Gagal upload gambar')
            }
        } catch (error) {
            alert('Error: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleDeleteImage = async (productId) => {
        if (!confirm('Hapus gambar produk ini?')) return

        try {
            const response = await authFetch(`/api/products/${productId}/image`, {
                method: 'DELETE'
            })

            if (response.ok) {
                onProductsChange()
            }
        } catch (error) {
            console.error('Error:', error)
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

    return (
        <div className="page-container" style={{ maxWidth: '100%', padding: '24px' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '4px', height: '48px', background: 'linear-gradient(180deg, #4f46e5, #7c3aed)', borderRadius: '2px' }}></div>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Daftar Produk</h1>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Kelola {products.length} produk, gambar, dan barcode</p>
                    </div>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(true)}
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none', padding: '12px 24px', fontSize: '15px', fontWeight: '600', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
                >
                    ➕ Tambah Produk
                </button>
            </div>

            {/* Product List Section */}
            <div style={{ background: 'var(--bg-white)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>

                <input
                    type="text"
                    className="form-input mb-md"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="🔍 Cari produk atau barcode..."
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredProducts.map(product => (
                        <div
                            key={product.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '16px 20px',
                                background: 'var(--bg-main)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-main)'}
                        >
                            {/* Product Image/Emoji */}
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '10px',
                                background: 'var(--bg-white)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                border: '1px solid var(--border)'
                            }}>
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                                ) : (
                                    <span style={{ fontSize: '1.8rem' }}>{product.emoji}</span>
                                )}
                            </div>

                            {/* Product Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '2px' }}>{product.name}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{formatRupiah(product.price)}</span>
                                    <span style={{ background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-primary)' }}>{product.category}</span>
                                    <span>Stok: <span style={{ fontWeight: '600', color: product.stock <= 5 ? 'var(--danger)' : 'var(--success)' }}>{product.stock}</span></span>
                                    {product.barcode && <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>📊 {product.barcode}</span>}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                                    📷 Gambar
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(product.id, e.target.files[0])} disabled={uploading} />
                                </label>
                                <button onClick={() => showBarcode(product)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>📊 Barcode</button>
                                <button onClick={() => openBarcodeModal(product)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>🏷️ Kelola</button>
                                <button onClick={() => handleEdit(product)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#4f46e5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'white' }}>✏️ Edit</button>
                                <button onClick={() => handleDelete(product.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'white' }}>🗑️ Hapus</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Barcode Preview Popup Modal */}
            {barcodeImage && (
                <div className="modal-overlay" onClick={() => setBarcodeImage(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h2>📊 Barcode & Gambar</h2>
                            <button className="modal-close" onClick={() => setBarcodeImage(null)}>×</button>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center' }}>
                            {/* Product Image */}
                            {barcodeImage.product.image_url && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <img
                                        src={barcodeImage.product.image_url}
                                        alt={barcodeImage.product.name}
                                        style={{ maxWidth: '180px', maxHeight: '180px', objectFit: 'cover', borderRadius: '12px', border: '2px solid #e5e7eb' }}
                                    />
                                    <div style={{ marginTop: '8px' }}>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteImage(barcodeImage.product.id)}>
                                            🗑️ Hapus Gambar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Barcode Image */}
                            <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
                                <img src={barcodeImage.imageUrl} alt={`Barcode for ${barcodeImage.product.name}`} style={{ maxWidth: '100%', height: 'auto' }} />
                            </div>

                            {/* Product Info */}
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{barcodeImage.product.emoji} {barcodeImage.product.name}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4f46e5' }}>{formatRupiah(barcodeImage.product.price)}</div>
                                {barcodeImage.product.barcode && (
                                    <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '4px' }}>{barcodeImage.product.barcode}</div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                                    📷 Upload Gambar
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(barcodeImage.product.id, e.target.files[0])} disabled={uploading} />
                                </label>
                                <button className="btn btn-success" onClick={printBarcode}>🖨️ Print</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{selectedProduct ? '✏️ Edit Produk' : '➕ Tambah Produk'}</h2>
                            <button className="modal-close" onClick={resetForm}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Barcode (Opsional untuk Snack/Kemasan)</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.barcode}
                                            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                            placeholder="Ketik atau scan barcode"
                                            style={{ flex: 1 }}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => setShowScanner(true)}
                                        >
                                            📷 Scan
                                        </button>
                                    </div>
                                    <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                        Kosongkan untuk Makanan/Minuman yang disajikan langsung
                                    </small>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Nama Produk *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Contoh: Nasi Goreng"
                                        required
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Harga Jual (Rp) *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            placeholder="15000"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Harga Modal (Rp)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.cost_price}
                                            onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                            placeholder="10000"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Stok *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.stock}
                                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                            placeholder="50"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Min. Stok (Alert)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.min_stock}
                                            onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                                            placeholder="5"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Kategori</label>
                                    <select
                                        className="form-input"
                                        value={formData.category === customCategory && customCategory ? 'Lainnya' : formData.category}
                                        onChange={(e) => {
                                            if (e.target.value === 'Lainnya') {
                                                setCustomCategory('')
                                                setFormData({ ...formData, category: '' })
                                            } else {
                                                setCustomCategory('')
                                                setFormData({ ...formData, category: e.target.value })
                                            }
                                        }}
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    {(formData.category === '' || formData.category === customCategory || !categories.includes(formData.category)) && (
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={customCategory || formData.category}
                                            onChange={(e) => {
                                                setCustomCategory(e.target.value)
                                                setFormData({ ...formData, category: e.target.value })
                                            }}
                                            placeholder="Ketik kategori baru..."
                                            style={{ marginTop: '0.5rem' }}
                                        />
                                    )}
                                </div>

                                {/* Image Upload Section */}
                                <div className="form-group">
                                    <label className="form-label">Foto Produk</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        {/* Preview */}
                                        <div style={{
                                            width: '80px',
                                            height: '80px',
                                            borderRadius: '12px',
                                            background: '#f3f4f6',
                                            border: '2px dashed #d1d5db',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            flexShrink: 0
                                        }}>
                                            {previewUrl ? (
                                                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : selectedProduct?.image_url ? (
                                                <img src={selectedProduct.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '2rem', opacity: 0.4 }}>📷</span>
                                            )}
                                        </div>
                                        {/* Upload Info */}
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                                                {previewUrl ? '✅ Foto siap diupload' : selectedProduct?.image_url ? 'Foto sudah diupload' : 'Pilih foto untuk produk'}
                                            </p>
                                            <label style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '8px 16px',
                                                background: '#4f46e5',
                                                color: 'white',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                fontWeight: '500'
                                            }}>
                                                📷 {previewUrl || selectedProduct?.image_url ? 'Ganti Foto' : 'Pilih Foto'}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        if (e.target.files[0]) {
                                                            const file = e.target.files[0]
                                                            if (selectedProduct) {
                                                                // Existing product - upload immediately
                                                                handleImageUpload(selectedProduct.id, file)
                                                            } else {
                                                                // New product - store for later
                                                                setPendingImageFile(file)
                                                                setPreviewUrl(URL.createObjectURL(file))
                                                            }
                                                        }
                                                    }}
                                                    disabled={uploading}
                                                />
                                            </label>
                                            {(previewUrl || selectedProduct?.image_url) && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (previewUrl) {
                                                            setPendingImageFile(null)
                                                            setPreviewUrl(null)
                                                        } else if (selectedProduct) {
                                                            handleDeleteImage(selectedProduct.id)
                                                        }
                                                    }}
                                                    style={{
                                                        marginLeft: '8px',
                                                        padding: '8px 16px',
                                                        background: '#fee2e2',
                                                        color: '#ef4444',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    🗑️ Hapus
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Emoji (Fallback jika tidak ada foto)</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {emojiOptions.map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                className={`btn ${formData.emoji === emoji ? 'btn-primary' : 'btn-ghost'}`}
                                                style={{ fontSize: '1.5rem', padding: '0.5rem' }}
                                                onClick={() => setFormData({ ...formData, emoji })}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={resetForm}>Batal</button>
                                <button type="submit" className="btn btn-success">
                                    {selectedProduct ? 'Simpan' : 'Tambah'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Uploading Overlay */}
            {uploading && (
                <div className="modal-overlay">
                    <div style={{ textAlign: 'center', color: 'white' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                        <p>Mengupload gambar...</p>
                    </div>
                </div>
            )}

            {/* Barcode Scanner Modal */}
            {showScanner && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2>📷 Scan Barcode</h2>
                            <button className="modal-close" onClick={() => {
                                setShowScanner(false)
                                setScannerStatus('')
                                if (readerRef.current) {
                                    readerRef.current.reset()
                                }
                            }}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{
                                background: '#000',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                position: 'relative'
                            }}>
                                <video
                                    ref={videoRef}
                                    style={{ width: '100%', height: 'auto', maxHeight: '250px', objectFit: 'cover' }}
                                    playsInline
                                    muted
                                    autoPlay
                                />
                            </div>

                            {scannerStatus && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '8px',
                                    color: scannerStatus.includes('❌') ? 'var(--danger)' : 'var(--success)',
                                    fontSize: '0.85rem'
                                }}>
                                    {scannerStatus}
                                </div>
                            )}

                            <div style={{ marginTop: '12px' }}>
                                <button
                                    className="btn btn-primary w-full"
                                    onClick={async () => {
                                        try {
                                            setScannerStatus('Memulai kamera...')

                                            if (!readerRef.current) {
                                                readerRef.current = new BrowserMultiFormatReader()
                                            }

                                            const devices = await readerRef.current.listVideoInputDevices()
                                            if (!devices.length) {
                                                setScannerStatus('❌ Tidak ada kamera')
                                                return
                                            }

                                            const backCam = devices.find(d =>
                                                d.label.toLowerCase().includes('back') ||
                                                d.label.toLowerCase().includes('environment')
                                            ) || devices[0]

                                            setScannerStatus('Arahkan ke barcode...')

                                            await readerRef.current.decodeFromVideoDevice(
                                                backCam.deviceId,
                                                videoRef.current,
                                                (result) => {
                                                    if (result) {
                                                        const barcode = result.getText()
                                                        setFormData(prev => ({ ...prev, barcode }))
                                                        setScannerStatus('✅ Barcode: ' + barcode)

                                                        // Stop scanner and close modal after 1 second
                                                        setTimeout(() => {
                                                            if (readerRef.current) readerRef.current.reset()
                                                            setShowScanner(false)
                                                            setScannerStatus('')
                                                        }, 1000)
                                                    }
                                                }
                                            )
                                        } catch (err) {
                                            setScannerStatus('❌ ' + (err.message || 'Gagal akses kamera'))
                                        }
                                    }}
                                >
                                    ▶ Mulai Scan
                                </button>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-ghost"
                                onClick={() => {
                                    setShowScanner(false)
                                    setScannerStatus('')
                                    if (readerRef.current) readerRef.current.reset()
                                }}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Barcode Management Modal */}
            {showBarcodeModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>🏷️ Kelola Barcode</h2>
                            <button className="modal-close" onClick={() => setShowBarcodeModal(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Product Info */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                background: 'var(--bg-main)',
                                borderRadius: '8px',
                                marginBottom: '16px'
                            }}>
                                <span style={{ fontSize: '2rem' }}>{showBarcodeModal.emoji}</span>
                                <div>
                                    <div style={{ fontWeight: '600' }}>{showBarcodeModal.name}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {showBarcodeModal.category}
                                    </div>
                                </div>
                            </div>

                            {/* Barcode List */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                                    Daftar Barcode ({productBarcodes.length})
                                </div>
                                {productBarcodes.length === 0 ? (
                                    <div style={{
                                        color: 'var(--text-muted)',
                                        textAlign: 'center',
                                        padding: '16px',
                                        background: 'var(--bg-main)',
                                        borderRadius: '8px'
                                    }}>
                                        Belum ada barcode
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {productBarcodes.map((bc, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 12px',
                                                background: 'var(--bg-main)',
                                                borderRadius: '8px',
                                                border: bc.is_primary ? '2px solid var(--primary)' : '1px solid var(--border)'
                                            }}>
                                                <div>
                                                    <div style={{ fontFamily: 'monospace', fontWeight: '500' }}>
                                                        {bc.barcode}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {bc.is_primary ? '⭐ Barcode Utama' : bc.description}
                                                    </div>
                                                </div>
                                                {!bc.is_primary && (
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => deleteBarcodeAlias(bc.id)}
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Add New Barcode - Batch Scan Mode */}
                            <div style={{
                                padding: '16px',
                                background: 'var(--bg-main)',
                                borderRadius: '8px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{ fontWeight: '600' }}>
                                        ➕ Tambah Barcode
                                    </div>
                                    <button
                                        className={`btn btn-sm ${batchScanMode ? 'btn-danger' : 'btn-primary'}`}
                                        onClick={async () => {
                                            if (batchScanMode) {
                                                setBatchScanMode(false)
                                                if (scanBarcodeReaderRef.current) {
                                                    scanBarcodeReaderRef.current.reset()
                                                }
                                            } else {
                                                // Set batch mode first, then start scanner after small delay
                                                setBatchScanMode(true)
                                                // Wait for video element to render
                                                setTimeout(async () => {
                                                    try {
                                                        if (!scanBarcodeReaderRef.current) {
                                                            scanBarcodeReaderRef.current = new BrowserMultiFormatReader()
                                                        }
                                                        const devices = await scanBarcodeReaderRef.current.listVideoInputDevices()
                                                        const backCam = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0]
                                                        if (backCam && scanVideoRef.current) {
                                                            await scanBarcodeReaderRef.current.decodeFromVideoDevice(
                                                                backCam.deviceId,
                                                                scanVideoRef.current,
                                                                (result) => {
                                                                    if (result) addBarcodeFromScan(result.getText())
                                                                }
                                                            )
                                                        } else {
                                                            console.error('No video element or camera')
                                                            setBatchScanMode(false)
                                                        }
                                                    } catch (err) {
                                                        console.error('Scanner error:', err)
                                                        setBatchScanMode(false)
                                                    }
                                                }, 200) // Wait 200ms for video to render
                                            }
                                        }}
                                    >
                                        {batchScanMode ? '⏹ Stop' : '📷 Kamera'}
                                    </button>
                                    <button
                                        className={`btn btn-sm ${usbScanMode ? 'btn-danger' : 'btn-success'}`}
                                        onClick={() => {
                                            if (usbScanMode) {
                                                setUsbScanMode(false)
                                            } else {
                                                setBatchScanMode(false)
                                                if (scanBarcodeReaderRef.current) scanBarcodeReaderRef.current.reset()
                                                setUsbScanMode(true)
                                                usbBufferRef.current = ''
                                            }
                                        }}
                                    >
                                        {usbScanMode ? '⏹ Stop' : '🔌 USB'}
                                    </button>
                                </div>
                                {batchScanMode && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <video ref={scanVideoRef} style={{ width: '100%', maxHeight: '180px', borderRadius: '8px', background: '#000' }} playsInline muted autoPlay />
                                        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--success)', marginTop: '8px' }}>
                                            📷 Scan kamera aktif ({scannedBarcodes.length} baru)
                                        </div>
                                    </div>
                                )}
                                {usbScanMode && (
                                    <div style={{
                                        marginBottom: '12px',
                                        padding: '16px',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        color: 'white'
                                    }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔌</div>
                                        <div style={{ fontWeight: '600' }}>USB Scanner Aktif</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '4px' }}>
                                            Langsung scan barcode dengan scanner USB!
                                        </div>
                                        {scannedBarcodes.length > 0 && (
                                            <div style={{ marginTop: '8px', fontWeight: '600' }}>
                                                ✓ {scannedBarcodes.length} barcode ditambahkan
                                            </div>
                                        )}
                                    </div>
                                )}
                                {!batchScanMode && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input type="text" className="form-input" value={newBarcodeInput} onChange={(e) => setNewBarcodeInput(e.target.value)} placeholder="Atau ketik barcode manual..." />
                                        <button className="btn btn-success w-full" onClick={addBarcodeAlias} disabled={!newBarcodeInput.trim()}>➕ Tambah</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowBarcodeModal(null)}>
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminPage

