export default function LoadingSpinner({ size = 'md', text = '' }) {
  const dim = { sm: 20, md: 32, lg: 48 }[size] || 32;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14">
      <div
        style={{
          width: dim,
          height: dim,
          borderRadius: '50%',
          border: `2px solid var(--border-default)`,
          borderTopColor: 'var(--primary)',
          animation: 'spin-smooth 0.7s linear infinite',
        }}
      />
      {text && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{text}</p>
      )}
    </div>
  );
}
