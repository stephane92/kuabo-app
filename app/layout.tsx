export default function RootLayout({ children }: any) {
  return (
    <html lang="fr">
      <head>
        {/* 🔥 FIX RESPONSIVE MOBILE */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </head>

      <body
        style={{
          margin: 0,
          padding: 0,
          width: "100%",
          maxWidth: "100vw",
          overflowX: "hidden",
          fontFamily: "system-ui, sans-serif",
          background: "#06080a",
        }}
      >
        {children}
      </body>
    </html>
  );
}