import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

function Header({ currentPage, onPageChange, cartCount }) {
    const { user, logout, isAdmin } = useAuth()
    const { toggleTheme, isDark } = useTheme()
    const [menuOpen, setMenuOpen] = useState(false)

    const navItems = [
        { id: 'cashier', label: 'Kasir', icon: '🛒' },
        ...(isAdmin ? [
            { id: 'admin', label: 'Produk', icon: '📦' },
            { id: 'inventory', label: 'Stok', icon: '📊' },
            { id: 'customers', label: 'Pelanggan', icon: '👥' },
            { id: 'users', label: 'User', icon: '👤' },
            { id: 'discounts', label: 'Diskon', icon: '🏷️' },
            { id: 'reports', label: 'Laporan', icon: '📈' },
        ] : []),
        { id: 'history', label: 'Riwayat', icon: '📋' },
    ]

    const handleNavClick = (pageId) => {
        onPageChange(pageId)
        setMenuOpen(false)
    }

    return (
        <header className="header">
            <div className="header-container">
                {/* Logo - Visible on both */}
                <div className="logo">
                    <img
                        src="/kasirzcuu-logo.svg"
                        alt="KasirzCuu"
                        style={{
                            height: '50px', // Adjusted size for SVG
                            objectFit: 'contain'
                        }}
                    />
                </div>

                {/* DESKTOP: Navigation */}
                <nav className="nav desktop-only">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            className={`nav-btn ${currentPage === item.id ? 'active' : ''}`}
                            onClick={() => handleNavClick(item.id)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                            {item.id === 'cashier' && cartCount > 0 && (
                                <span className="cart-badge">{cartCount}</span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* DESKTOP: Right Section */}
                <div className="header-right desktop-only">
                    <button
                        className="theme-toggle-btn"
                        onClick={toggleTheme}
                        title={isDark ? 'Light Mode' : 'Dark Mode'}
                    >
                        {isDark ? '☀️' : '🌙'}
                    </button>

                    <div className="user-info">
                        <span className="user-name">
                            {user?.role === 'admin' ? '👑' : '👤'} {user?.full_name}
                        </span>
                        <button className="btn btn-ghost btn-sm" onClick={logout}>
                            Logout
                        </button>
                    </div>
                </div>

                {/* MOBILE: Hamburger Button */}
                <button
                    className="hamburger-btn mobile-only"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Menu"
                >
                    <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
                </button>
            </div>

            {/* MOBILE: Slide-out Menu */}
            {menuOpen && (
                <>
                    <div className="nav-overlay mobile-only" onClick={() => setMenuOpen(false)}></div>
                    <div className="mobile-menu mobile-only">
                        <div className="mobile-menu-header">
                            <div className="mobile-user-avatar">
                                {user?.role === 'admin' ? '👑' : '👤'}
                            </div>
                            <div className="mobile-user-info">
                                <span className="mobile-user-name">{user?.full_name}</span>
                                <span className="mobile-user-role">
                                    {user?.role === 'admin' ? 'Administrator' : 'Kasir'}
                                </span>
                            </div>
                        </div>

                        <div className="mobile-menu-items">
                            {navItems.map(item => (
                                <button
                                    key={item.id}
                                    className={`mobile-menu-btn ${currentPage === item.id ? 'active' : ''}`}
                                    onClick={() => handleNavClick(item.id)}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                    <span className="nav-label">{item.label}</span>
                                    {item.id === 'cashier' && cartCount > 0 && (
                                        <span className="cart-badge">{cartCount}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="mobile-menu-footer">
                            <button className="mobile-menu-btn" onClick={toggleTheme}>
                                <span className="nav-icon">{isDark ? '☀️' : '🌙'}</span>
                                <span className="nav-label">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                            </button>
                            <button className="mobile-menu-btn logout" onClick={logout}>
                                <span className="nav-icon">🚪</span>
                                <span className="nav-label">Logout</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </header>
    )
}

export default Header
