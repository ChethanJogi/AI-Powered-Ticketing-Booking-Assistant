export default function LoadingState({ text = 'Loading…' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      <span>{text}</span>
    </div>
  );
}
