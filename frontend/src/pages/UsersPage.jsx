import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../components/PageTitle'

function UsersPage() {
    const { authFetch, isAdmin } = useAuth()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [showResetPassword, setShowResetPassword] = useState(null)
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        role: 'kasir'
    })
    const [newPassword, setNewPassword] = useState('')

    useEffect(() => {
        if (isAdmin) loadUsers()
    }, [isAdmin])

    const loadUsers = async () => {
        try {
            const response = await authFetch('/api/users')
            if (response.ok) {
                const data = await response.json()
                setUsers(data)
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const url = selectedUser
                ? `/api/users/${selectedUser.id}`
                : '/api/users'

            const body = selectedUser
                ? {
                    username: formData.username,
                    full_name: formData.full_name,
                    role: formData.role
                }
                : formData

            const response = await authFetch(url, {
                method: selectedUser ? 'PUT' : 'POST',
                body: JSON.stringify(body)
            })

            if (response.ok) {
                loadUsers()
                resetForm()
            } else {
                const error = await response.json()
                alert(error.detail)
            }
        } catch (error) {
            alert('Error: ' + error.message)
        }
    }

    const handleResetPassword = async (e) => {
        e.preventDefault()
        try {
            const response = await authFetch(`/api/users/${showResetPassword.id}/reset-password`, {
                method: 'POST',
                body: JSON.stringify({ new_password: newPassword })
            })
            if (response.ok) {
                alert('Password berhasil direset!')
                setShowResetPassword(null)
                setNewPassword('')
            } else {
                const error = await response.json()
                alert(error.detail)
            }
        } catch (error) {
            alert('Error: ' + error.message)
        }
    }

    const toggleUserStatus = async (user) => {
        try {
            const response = await authFetch(`/api/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: !user.is_active })
            })
            if (response.ok) loadUsers()
            else {
                const error = await response.json()
                alert(error.detail)
            }
        } catch (error) {
            alert('Error: ' + error.message)
        }
    }

    const handleEdit = (user) => {
        setSelectedUser(user)
        setFormData({
            username: user.username,
            password: '',
            full_name: user.full_name,
            role: user.role
        })
        setShowForm(true)
    }

    const resetForm = () => {
        setShowForm(false)
        setSelectedUser(null)
        setFormData({ username: '', password: '', full_name: '', role: 'kasir' })
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

    if (loading) {
        return <div className="flex-center" style={{ height: '50vh' }}><div className="spinner"></div></div>
    }

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <PageTitle
                    title="Manajemen User"
                    subtitle="Kelola akun kasir dan admin"
                />
                <button
                    onClick={() => setShowForm(true)}
                    style={{
                        padding: '10px 20px',
                        background: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#4338ca'}
                    onMouseLeave={(e) => e.target.style.background = '#4f46e5'}
                >
                    ➕ Tambah User
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 mb-6">
                <div className="card">
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#4f46e5', marginBottom: '8px' }}>
                        {users.length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Total User</div>
                </div>
                <div className="card">
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
                        {users.filter(u => u.is_active).length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>User Aktif</div>
                </div>
                <div className="card">
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b', marginBottom: '8px' }}>
                        {users.filter(u => u.role === 'admin').length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Admin</div>
                </div>
                <div className="card">
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>
                        {users.filter(u => u.role === 'kasir').length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Kasir</div>
                </div>
            </div>

            {/* User Table (Desktop) */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} style={{ opacity: user.is_active ? 1 : 0.6 }}>
                                <td>
                                    <div className="user-cell">
                                        <div className="user-avatar-small">
                                            {user.role === 'admin' ? '👑' : '👤'}
                                        </div>
                                        <span style={{ fontWeight: 500 }}>{user.full_name}</span>
                                    </div>
                                </td>
                                <td className="text-muted">@{user.username}</td>
                                <td>
                                    <span className={`status-badge ${user.role === 'admin' ? 'status-gold' : 'status-silver'}`}>
                                        {user.role === 'admin' ? 'Administrator' : 'Kasir'}
                                    </span>
                                </td>
                                <td>
                                    <span className={`status-badge ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                                        {user.is_active ? '🟢 Aktif' : '🔴 Nonaktif'}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleEdit(user)}
                                            title="Edit"
                                            style={{
                                                padding: '6px 12px',
                                                background: '#f3f4f6',
                                                color: '#374151',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.background = '#e5e7eb'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background = '#f3f4f6'
                                            }}
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => setShowResetPassword(user)}
                                            title="Reset Password"
                                            style={{
                                                padding: '6px 12px',
                                                background: '#fef3c7',
                                                color: '#92400e',
                                                border: '1px solid #fde68a',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.background = '#fde68a'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background = '#fef3c7'
                                            }}
                                        >
                                            🔑
                                        </button>
                                        <button
                                            onClick={() => toggleUserStatus(user)}
                                            title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                            style={{
                                                padding: '6px 12px',
                                                background: user.is_active ? '#fee2e2' : '#d1fae5',
                                                color: user.is_active ? '#991b1b' : '#065f46',
                                                border: user.is_active ? '1px solid #fecaca' : '1px solid #a7f3d0',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.background = user.is_active ? '#fecaca' : '#a7f3d0'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background = user.is_active ? '#fee2e2' : '#d1fae5'
                                            }}
                                        >
                                            {user.is_active ? '🚫' : '✓'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List (Mobile Only) */}
            <div className="mobile-card-list">
                {users.map(user => (
                    <div key={user.id} className="mobile-card" style={{ opacity: user.is_active ? 1 : 0.6 }}>
                        <div className="mobile-card-header">
                            <div className="user-cell">
                                <div className="user-avatar-small">
                                    {user.role === 'admin' ? '👑' : '👤'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 600 }}>{user.full_name}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{user.username}</span>
                                </div>
                            </div>
                            <span className={`status-badge ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                                {user.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                        </div>

                        <div className="mobile-card-row">
                            <span className="mobile-card-label">Role</span>
                            <span className={`status-badge ${user.role === 'admin' ? 'status-gold' : 'status-silver'}`}>
                                {user.role === 'admin' ? 'Administrator' : 'Kasir'}
                            </span>
                        </div>

                        <div className="mobile-card-actions">
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleEdit(user)}
                            >
                                ✏️ Edit
                            </button>
                            <button
                                className="btn btn-warning btn-sm"
                                onClick={() => setShowResetPassword(user)}
                            >
                                🔑 Reset
                            </button>
                            <button
                                className={`btn btn-sm ${user.is_active ? 'btn-danger' : 'btn-success'}`}
                                onClick={() => toggleUserStatus(user)}
                            >
                                {user.is_active ? '🚫 Disable' : '✓ Enable'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create/Edit Form Modal */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{selectedUser ? '✏️ Edit User' : '➕ Tambah User Baru'}</h2>
                            <button className="modal-close" onClick={resetForm}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Username *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="contoh: kasir1"
                                        required
                                    />
                                </div>
                                {!selectedUser && (
                                    <div className="form-group">
                                        <label className="form-label">Password *</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="Minimal 4 karakter"
                                            required
                                            minLength={4}
                                        />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Nama Lengkap *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="Nama tampilan"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role *</label>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 20px',
                                            background: formData.role === 'kasir' ? 'var(--primary)' : 'var(--bg-main)',
                                            color: formData.role === 'kasir' ? 'white' : 'inherit',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            flex: 1,
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            border: '1px solid var(--border)'
                                        }}>
                                            <input
                                                type="radio"
                                                name="role"
                                                value="kasir"
                                                checked={formData.role === 'kasir'}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                style={{ display: 'none' }}
                                            />
                                            👤 Kasir
                                        </label>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 20px',
                                            background: formData.role === 'admin' ? 'var(--warning)' : 'var(--bg-main)',
                                            color: formData.role === 'admin' ? 'white' : 'inherit',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            flex: 1,
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            border: '1px solid var(--border)'
                                        }}>
                                            <input
                                                type="radio"
                                                name="role"
                                                value="admin"
                                                checked={formData.role === 'admin'}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                style={{ display: 'none' }}
                                            />
                                            👑 Admin
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={resetForm}>Batal</button>
                                <button type="submit" className="btn btn-success">
                                    {selectedUser ? 'Simpan' : 'Buat User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetPassword && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2>🔑 Reset Password</h2>
                            <button className="modal-close" onClick={() => setShowResetPassword(null)}>×</button>
                        </div>
                        <form onSubmit={handleResetPassword}>
                            <div className="modal-body">
                                <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
                                    Reset password untuk <strong>{showResetPassword.full_name}</strong> (@{showResetPassword.username})
                                </p>
                                <div className="form-group">
                                    <label className="form-label">Password Baru *</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minimal 4 karakter"
                                        required
                                        minLength={4}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowResetPassword(null)}>Batal</button>
                                <button type="submit" className="btn btn-warning">Reset Password</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UsersPage
