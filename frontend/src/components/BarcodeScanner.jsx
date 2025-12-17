import { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'

function BarcodeScanner({ onScan, isScanning, setIsScanning }) {
    const videoRef = useRef(null)
    const readerRef = useRef(null)
    const lastScannedRef = useRef(null)
    const lastScanTimeRef = useRef(0)
    const [error, setError] = useState(null)
    const [manualInput, setManualInput] = useState('')
    const [scanCount, setScanCount] = useState(0)
    const [status, setStatus] = useState('')

    // Debounced scan handler
    const handleScan = useCallback((decodedText) => {
        const now = Date.now()

        // Prevent accidental double scans within 500ms (but allow intentional re-scans)
        if (decodedText === lastScannedRef.current && now - lastScanTimeRef.current < 500) {
            return
        }

        lastScannedRef.current = decodedText
        lastScanTimeRef.current = now
        setScanCount(prev => prev + 1)

        // Play beep sound
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()
            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)
            oscillator.frequency.value = 1200
            oscillator.type = 'sine'
            gainNode.gain.value = 0.3
            oscillator.start()
            oscillator.stop(audioContext.currentTime + 0.15)
        } catch (e) { }

        onScan(decodedText)
    }, [onScan])

    useEffect(() => {
        let mounted = true

        const startScanner = async () => {
            try {
                setError(null)
                setStatus('Memulai kamera...')

                // Create reader
                if (!readerRef.current) {
                    readerRef.current = new BrowserMultiFormatReader()
                }

                // Get video devices
                const videoDevices = await readerRef.current.listVideoInputDevices()

                if (videoDevices.length === 0) {
                    setError('Tidak ada kamera yang ditemukan')
                    setIsScanning(false)
                    return
                }

                setStatus('Kamera aktif - Arahkan ke barcode')

                // Use back camera if available
                const backCamera = videoDevices.find(d =>
                    d.label.toLowerCase().includes('back') ||
                    d.label.toLowerCase().includes('belakang') ||
                    d.label.toLowerCase().includes('environment')
                ) || videoDevices[0]

                // Start decoding with video constraints for auto focus
                await readerRef.current.decodeFromVideoDevice(
                    backCamera.deviceId,
                    videoRef.current,
                    (result, error) => {
                        if (result && mounted) {
                            handleScan(result.getText())
                        }
                        // Ignore errors - they happen when no barcode is visible
                    }
                )

                // Apply auto focus to video stream
                if (videoRef.current && videoRef.current.srcObject) {
                    const stream = videoRef.current.srcObject
                    const track = stream.getVideoTracks()[0]
                    if (track) {
                        const capabilities = track.getCapabilities()
                        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                            try {
                                await track.applyConstraints({
                                    advanced: [{ focusMode: 'continuous' }]
                                })
                                console.log('✅ Auto focus enabled')
                            } catch (e) {
                                console.log('⚠️ Auto focus not supported:', e)
                            }
                        }
                    }
                }

            } catch (err) {
                console.error('Scanner error:', err)
                if (mounted) {
                    if (err.name === 'NotAllowedError') {
                        setError('Izin kamera ditolak. Buka pengaturan browser dan izinkan kamera.')
                    } else if (err.name === 'NotFoundError') {
                        setError('Kamera tidak ditemukan.')
                    } else if (err.name === 'NotReadableError') {
                        setError('Kamera sedang digunakan aplikasi lain.')
                    } else {
                        setError('Gagal: ' + (err.message || err))
                    }
                    setIsScanning(false)
                    setStatus('')
                }
            }
        }

        const stopScanner = () => {
            setStatus('')
            if (readerRef.current) {
                readerRef.current.reset()
            }
        }

        if (isScanning) {
            startScanner()
        } else {
            stopScanner()
        }

        return () => {
            mounted = false
            stopScanner()
        }
    }, [isScanning, handleScan, setIsScanning])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (readerRef.current) {
                readerRef.current.reset()
                readerRef.current = null
            }
        }
    }, [])

    const toggleScanner = () => {
        setError(null)
        if (isScanning) {
            setIsScanning(false)
        } else {
            setIsScanning(true)
            setScanCount(0)
        }
    }

    const handleManualSubmit = (e) => {
        e.preventDefault()
        if (manualInput.trim()) {
            handleScan(manualInput.trim())
            setManualInput('')
        }
    }

    return (
        <div className="scanner-card">
            {/* Video Container */}
            <div
                className="scanner-container"
                style={{
                    display: isScanning ? 'block' : 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    background: '#000'
                }}
            >
                <video
                    ref={videoRef}
                    style={{
                        width: '100%',
                        height: 'auto',
                        minHeight: '250px',
                        maxHeight: '400px',
                        objectFit: 'cover'
                    }}
                    playsInline
                    muted
                />
                {/* Scan line animation */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '10%',
                    right: '10%',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #00ff00, transparent)',
                    animation: 'scanLine 2s ease-in-out infinite'
                }} />
            </div>

            {/* Status */}
            {status && isScanning && (
                <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--success)',
                    textAlign: 'center',
                    padding: '8px 0'
                }}>
                    ✅ {status}
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--danger)',
                    textAlign: 'center',
                    padding: '8px',
                    background: 'var(--danger-light)',
                    borderRadius: '6px',
                    margin: '8px 0'
                }}>
                    ❌ {error}
                </div>
            )}



            {/* Manual Input */}
            <form onSubmit={handleManualSubmit} style={{ marginTop: '12px' }}>
                <div className="flex gap-sm">
                    <input
                        type="text"
                        className="form-input"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="Ketik barcode..."
                        style={{ flex: 1, fontSize: '0.85rem' }}
                    />
                    <button type="submit" className="btn btn-ghost">➕</button>
                </div>
            </form>

            {/* CSS for scan line animation */}
            <style>{`
                @keyframes scanLine {
                    0%, 100% { transform: translateY(-30px); opacity: 0.5; }
                    50% { transform: translateY(30px); opacity: 1; }
                }
            `}</style>
        </div>
    )
}

export default BarcodeScanner
