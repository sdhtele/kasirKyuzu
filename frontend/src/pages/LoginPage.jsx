import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

function LoginPage() {
    const { login } = useAuth()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            await login(username, password)
        } catch (err) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <span className="login-logo">🛒</span>
                        <h1>TOKO MAKANAN</h1>
                        <p>Sistem Kasir</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {error && (
                            <div className="alert alert-error">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                                type="text"
                                className="form-input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Masukkan username"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Masukkan password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%' }}
                            disabled={isLoading}
                        >
                            {isLoading ? '⏳ Memproses...' : '🔐 Login'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>Demo Accounts:</p>
                        <div className="demo-accounts">
                            <div className="demo-account">
                                <strong>Admin:</strong> admin / admin123
                            </div>
                            <div className="demo-account">
                                <strong>Kasir:</strong> kasir / kasir123
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoginPage
