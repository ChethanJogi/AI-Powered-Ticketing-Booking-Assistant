// as: 'input' | 'textarea' | 'select'
export default function Input({ label, error, as = 'input', children, id, ...rest }) {
  const Tag = as;
  const fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="field">
      {label && <label htmlFor={fieldId}>{label}</label>}
      <Tag id={fieldId} className={`input ${error ? 'has-error' : ''}`} {...rest}>{children}</Tag>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
