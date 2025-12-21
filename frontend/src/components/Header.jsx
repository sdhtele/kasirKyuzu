import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
    ShoppingCart,
    Package,
    BarChart3,
    Users,
    UserCog,
    Tag,
    TrendingUp,
    History,
    Crown,
    User as UserIcon,
    Moon,
    Sun,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    X
} from 'lucide-react'

function Header({ currentPage, onPageChange, cartCount, sidebarCollapsed, onSidebarToggle }) {
    const { user, logout, isAdmin } = useAuth()
    const { toggleTheme, isDark } = useTheme()

    // Mobile menu state
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Save sidebar state to localStorage when it changes
    useEffect(() => {
        if (sidebarCollapsed !== undefined) {
            localStorage.setItem('sidebarCollapsed', sidebarCollapsed)
        }
    }, [sidebarCollapsed])

    const navItems = [
        { id: 'cashier', label: 'Kasir', icon: ShoppingCart },
        ...(isAdmin ? [
            { id: 'admin', label: 'Produk', icon: Package },
            { id: 'inventory', label: 'Stok', icon: BarChart3 },
            { id: 'customers', label: 'Pelanggan', icon: Users },
            { id: 'users', label: 'User', icon: UserCog },
            { id: 'discounts', label: 'Diskon', icon: Tag },
            { id: 'reports', label: 'Laporan', icon: TrendingUp },
        ] : []),
        { id: 'history', label: 'Riwayat', icon: History },
    ]

    const handleNavClick = (pageId) => {
        onPageChange(pageId)
        setMobileMenuOpen(false) // Close mobile menu after navigation
    }

    const toggleSidebar = () => {
        if (onSidebarToggle) {
            onSidebarToggle(!sidebarCollapsed)
        }
    }

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen)
    }

    return (
        <>
            {/* DESKTOP: Sidebar Navigation */}
            <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                {/* Sidebar Header */}
                <div className="sidebar-header">
                    <div className="sidebar-logo" onClick={() => onPageChange('cashier')} style={{ cursor: 'pointer' }}>
                        <img
                            src="/kasirzcuu-logo.svg"
                            alt="KasirzCuu"
                        />
                    </div>
                    <button
                        className="sidebar-toggle-btn"
                        onClick={toggleSidebar}
                        title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                        {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>

                {/* Sidebar Navigation Items */}
                <nav className="sidebar-nav">
                    {navItems.map(item => {
                        const IconComponent = item.icon
                        return (
                            <button
                                key={item.id}
                                className={`sidebar-nav-item ${currentPage === item.id ? 'active' : ''}`}
                                onClick={() => handleNavClick(item.id)}
                                title={sidebarCollapsed ? item.label : ''}
                            >
                                <span className="nav-icon">
                                    <IconComponent size={20} strokeWidth={2} />
                                </span>
                                <span className="nav-label">{item.label}</span>
                                {item.id === 'cashier' && cartCount > 0 && (
                                    <span className="cart-badge">{cartCount}</span>
                                )}
                            </button>
                        )
                    })}
                </nav>

                {/* Sidebar Footer */}
                <div className="sidebar-footer">
                    {/* User Info */}
                    <div className="sidebar-user">
                        <div className="sidebar-user-avatar">
                            {user?.role === 'admin' ? <Crown size={20} /> : <UserIcon size={20} />}
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{user?.full_name}</div>
                            <div className="sidebar-user-role">
                                {user?.role === 'admin' ? 'Administrator' : 'Kasir'}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="sidebar-actions">
                        <button
                            className="sidebar-action-btn"
                            onClick={toggleTheme}
                            title={isDark ? 'Light Mode' : 'Dark Mode'}
                        >
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button
                            className="sidebar-action-btn logout"
                            onClick={logout}
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* MOBILE: Top Header with Hamburger */}
            <header className="header mobile-only">
                <div className="header-container">
                    <button
                        className="hamburger-btn"
                        onClick={toggleMobileMenu}
                        aria-label="Menu"
                    >
                        <span className="hamburger-line"></span>
                        <span className="hamburger-line"></span>
                        <span className="hamburger-line"></span>
                    </button>

                    <div className="logo" onClick={() => onPageChange('cashier')} style={{ cursor: 'pointer' }}>
                        <img
                            src="/kasirzcuu-logo.svg"
                            alt="KasirzCuu"
                        />
                    </div>

                    {cartCount > 0 && (
                        <div className="header-cart-badge">{cartCount}</div>
                    )}
                </div>
            </header>

            {/* MOBILE: Slide-out Drawer Menu */}
            {mobileMenuOpen && (
                <>
                    <div className="mobile-menu-overlay" onClick={toggleMobileMenu}></div>
                    <div className="mobile-menu-drawer">
                        {/* User Info Header with Close Button */}
                        <div className="mobile-menu-header">
                            <div className="mobile-user-avatar">
                                {user?.role === 'admin' ? <Crown size={24} /> : <UserIcon size={24} />}
                            </div>
                            <div className="mobile-user-info">
                                <div className="mobile-user-name">{user?.full_name}</div>
                                <div className="mobile-user-role">
                                    {user?.role === 'admin' ? 'Administrator' : 'Kasir'}
                                </div>
                            </div>
                            <button
                                className="mobile-menu-close"
                                onClick={toggleMobileMenu}
                                aria-label="Close Menu"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Menu Items */}
                        <nav className="mobile-menu-nav">
                            {navItems.map(item => {
                                const IconComponent = item.icon
                                return (
                                    <button
                                        key={item.id}
                                        className={`mobile-menu-item ${currentPage === item.id ? 'active' : ''}`}
                                        onClick={() => handleNavClick(item.id)}
                                    >
                                        <span className="nav-icon">
                                            <IconComponent size={20} strokeWidth={2} />
                                        </span>
                                        <span className="nav-label">{item.label}</span>
                                        {item.id === 'cashier' && cartCount > 0 && (
                                            <span className="cart-badge">{cartCount}</span>
                                        )}
                                    </button>
                                )
                            })}
                        </nav>

                        {/* Footer Actions */}
                        <div className="mobile-menu-footer">
                            <button className="mobile-menu-item" onClick={toggleTheme}>
                                <span className="nav-icon">
                                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                                </span>
                                <span className="nav-label">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                            </button>
                            <button className="mobile-menu-item logout" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                                <span className="nav-icon">
                                    <LogOut size={20} />
                                </span>
                                <span className="nav-label">Logout</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    )
}

export default Header
