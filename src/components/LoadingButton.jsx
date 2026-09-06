export default function LoadingButton({ loading, loadingText = 'Loading…', children, disabled, className = 'primary-action', type = 'submit', ...props }) {
  return <button {...props} className={`${className} loading-button`} type={type} disabled={disabled || loading} aria-busy={loading}>
    {loading && <span className="button-spinner" aria-hidden="true" />}
    <span aria-live="polite">{loading ? loadingText : children}</span>
  </button>;
}
