export default function LoadingSpinner({ size = 'md', text = '' }) {
  const dim = { sm: 20, md: 32, lg: 48 }[size] || 32;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14">
      <span style={{
        width: dim, height: dim, borderRadius: '50%',
        border: '2px solid var(--line-2)',
        borderTopColor: 'var(--tx-2)',
        display: 'inline-block',
      }} className="animate-spin" />
      {text && <p className="t-body">{text}</p>}
    </div>
  );
}
