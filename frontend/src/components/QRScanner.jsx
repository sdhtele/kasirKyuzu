import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

function QRScanner({ onScan, isScanning, setIsScanning }) {
    const scannerRef = useRef(null)
    const html5QrCodeRef = useRef(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (isScanning && scannerRef.current) {
            startScanner()
        }

        return () => {
            stopScanner()
        }
    }, [isScanning])

    const startScanner = async () => {
        try {
            setError(null)

            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode('qr-reader')
            }

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.333
            }

            await html5QrCodeRef.current.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    // Parse QR code data
                    if (decodedText.startsWith('PRODUCT:')) {
                        const productId = parseInt(decodedText.replace('PRODUCT:', ''))
                        onScan(productId)
                    }
                },
                (errorMessage) => {
                    // Ignore scan errors (no QR found in frame)
                }
            )
        } catch (err) {
            console.error('Scanner error:', err)
            setError('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.')
            setIsScanning(false)
        }
    }

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop()
            } catch (err) {
                // Scanner might not be running
            }
        }
    }

    const toggleScanner = () => {
        if (isScanning) {
            stopScanner()
            setIsScanning(false)
        } else {
            setIsScanning(true)
        }
    }

    return (
        <div className="scanner-card">
            <h3 className="scanner-title">
                📷 QR Code Scanner
            </h3>

            <div className="scanner-container" id="qr-reader" ref={scannerRef}>
                {!isScanning && (
                    <div className="scanner-overlay">
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            color: 'white',
                            padding: '2rem'
                        }}>
                            <span style={{ fontSize: '4rem', marginBottom: '1rem' }}>📷</span>
                            <p>Klik tombol untuk mulai scan</p>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="scanner-status error">
                    ⚠️ {error}
                </div>
            )}

            <button
                className={`btn ${isScanning ? 'btn-danger' : 'btn-primary'} btn-lg mt-md`}
                onClick={toggleScanner}
                style={{ width: '100%' }}
            >
                {isScanning ? '⏹️ Stop Scanner' : '▶️ Mulai Scan'}
            </button>

            <p className="text-muted mt-md" style={{ fontSize: '0.85rem' }}>
                Arahkan kamera ke QR code produk untuk menambahkan ke keranjang
            </p>
        </div>
    )
}

export default QRScanner
