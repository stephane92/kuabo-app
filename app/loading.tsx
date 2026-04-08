export default function Loading() {
    return (
      <div style={container}>
        <h1 style={logo}>
          <span style={{ color: "#e8b84b" }}>Ku</span>
          <span style={{ color: "#fff" }}>abo</span>
        </h1>
      </div>
    );
  }
  
  ////////////////////////////////////////////////////
  // STYLES
  ////////////////////////////////////////////////////
  
  const container: any = {
    height: "100dvh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "radial-gradient(circle at top, #0b1220, #06080a)",
  };
  
  const logo: any = {
    fontSize: 32,
    fontWeight: "bold",
    animation: "fade 1.5s ease-in-out infinite alternate",
  };