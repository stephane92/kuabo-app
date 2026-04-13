import PWAInstaller from "./components/PWAInstaller";

export const metadata = {
  title: "Kuabo — Immigrants USA",
  description: "L'app qui accompagne les immigrants aux USA — SSN, Green Card, emploi, logement.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: any) {
  return (
    <html lang="fr">
      <head>
        {/* Responsive */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"/>

        {/* PWA */}
        <link rel="manifest" href="/manifest.json"/>
        <meta name="theme-color" content="#0b0f1a"/>

        {/* iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="Kuabo"/>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>

        {/* Favicon */}
        <link rel="icon" href="/icon.svg" type="image/svg+xml"/>
      </head>

      <body style={{
        margin: 0, padding: 0,
        width: "100%", maxWidth: "100vw",
        overflowX: "hidden",
        fontFamily: "system-ui, sans-serif",
        background: "#0b0f1a",
      }}>
        <PWAInstaller />
        {children}
      </body>
    </html>
  );
}
