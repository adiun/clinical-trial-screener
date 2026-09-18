export function Notice() {
  return (
    <div className="notice" role="note">
      <span className="notice-mark" aria-hidden="true" />
      Synthetic data only. Never load real patient data into this tool. Ground truth is used for evaluation and is never sent to Jev or Claude.
    </div>
  );
}
