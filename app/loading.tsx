export default function Loading() {
    return (
      <div style={{
        minHeight: "100dvh",
        background: "#0b0f1a",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}>
        <svg width="40" height="40" viewBox="0 0 40 40"
          style={{ animation: "spin 1s linear infinite" }}>
          <circle cx="20" cy="20" r="16" fill="none" stroke="#1e2a3a" strokeWidth="4" />
          <circle cx="20" cy="20" r="16" fill="none" stroke="#e8b84b" strokeWidth="4"
            strokeLinecap="round" strokeDasharray="100" strokeDashoffset="75" />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </svg>
      </div>
    );
  }