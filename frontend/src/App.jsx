import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Header from './components/Header'
import LoginPage from './pages/LoginPage'
import CashierPage from './pages/CashierPage'
import AdminPage from './pages/AdminPage'
import InventoryPage from './pages/InventoryPage'
import DiscountsPage from './pages/DiscountsPage'
import ReportsPage from './pages/ReportsPage'
import HistoryPage from './pages/HistoryPage'
import CustomersPage from './pages/CustomersPage'
import UsersPage from './pages/UsersPage'

function AppContent() {
    const { isAuthenticated, loading } = useAuth()
    const [currentPage, setCurrentPage] = useState('cashier')
    const [cart, setCart] = useState([])
    const [products, setProducts] = useState([])

    // Sidebar collapsed state - synced with Header
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed')
        return saved === 'true'
    })

    useEffect(() => {
        if (isAuthenticated) {
            fetchProducts()
        }
    }, [isAuthenticated])

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products')
            const data = await response.json()
            setProducts(data)
        } catch (error) {
            console.error('Error fetching products:', error)
        }
    }

    const addToCart = (product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id)
            if (existingItem) {
                // Check stock
                const currentQty = existingItem.quantity
                const availableStock = product.stock
                if (currentQty >= availableStock) {
                    alert(`Stok ${product.name} tidak cukup! Tersedia: ${availableStock}`)
                    return prevCart
                }
                return prevCart.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [...prevCart, { ...product, quantity: 1 }]
        })
    }

    const updateQuantity = (productId, newQuantity) => {
        setCart(prevCart => {
            // If quantity is 0 or less, remove item from cart
            if (newQuantity <= 0) {
                return prevCart.filter(item => item.id !== productId)
            }

            return prevCart.map(item => {
                if (item.id === productId) {
                    const product = products.find(p => p.id === productId)

                    // Check if new quantity exceeds stock
                    if (product && newQuantity > product.stock) {
                        alert(`Stok ${product.name} tidak cukup! Maksimal: ${product.stock}`)
                        return item // Keep current quantity
                    }

                    return { ...item, quantity: newQuantity }
                }
                return item
            })
        })
    }

    const clearCart = () => setCart([])

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    // Show loading
    if (loading) {
        return (
            <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner"></div>
            </div>
        )
    }

    // Show login if not authenticated
    if (!isAuthenticated) {
        return <LoginPage />
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'cashier':
                return (
                    <CashierPage
                        products={products}
                        cart={cart}
                        cartTotal={cartTotal}
                        cartCount={cartCount}
                        addToCart={addToCart}
                        updateQuantity={updateQuantity}
                        clearCart={clearCart}
                        fetchProducts={fetchProducts}
                    />
                )
            case 'admin':
                return <AdminPage products={products} onProductsChange={fetchProducts} />
            case 'inventory':
                return <InventoryPage />
            case 'discounts':
                return <DiscountsPage />
            case 'reports':
                return <ReportsPage />
            case 'history':
                return <HistoryPage />
            case 'customers':
                return <CustomersPage />
            case 'users':
                return <UsersPage />
            default:
                return null
        }
    }

    return (
        <div className="app">
            <Header
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                cartCount={cartCount}
                sidebarCollapsed={sidebarCollapsed}
                onSidebarToggle={setSidebarCollapsed}
            />
            <div className={`app-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <main className="main-content">
                    {renderPage()}
                </main>
            </div>
        </div>
    )
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </ThemeProvider>
    )
}

export default App
