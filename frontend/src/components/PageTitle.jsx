// Reusable Page Title Component with Vertical Accent Bar

export function PageTitle({ title, subtitle }) {
    return (
        <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                    width: '4px',
                    height: '48px',
                    background: 'linear-gradient(180deg, #4f46e5, #7c3aed)',
                    borderRadius: '4px'
                }}></div>
                <div>
                    <h1 className="page-title">{title}</h1>
                    {subtitle && <p className="page-subtitle">{subtitle}</p>}
                </div>
            </div>
        </div>
    )
}
