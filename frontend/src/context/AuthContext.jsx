import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(null)
    const [loading, setLoading] = useState(true)

    // Load from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('token')
        const savedUser = localStorage.getItem('user')

        if (savedToken && savedUser) {
            setToken(savedToken)
            setUser(JSON.parse(savedUser))
        }
        setLoading(false)
    }, [])

    const login = async (username, password) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.detail || 'Login gagal')
        }

        const data = await response.json()

        setToken(data.access_token)
        setUser(data.user)

        localStorage.setItem('token', data.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))

        return data.user
    }

    const logout = () => {
        setToken(null)
        setUser(null)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }

    const isAdmin = user?.role === 'admin'
    const isKasir = user?.role === 'kasir'
    const isAuthenticated = !!token

    // Helper for authenticated requests
    const authFetch = async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(url, { ...options, headers })

        // Handle token expiry
        if (response.status === 401) {
            logout()
            throw new Error('Sesi telah berakhir')
        }

        return response
    }

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        isAdmin,
        isKasir,
        isAuthenticated,
        authFetch
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

export default AuthContext
