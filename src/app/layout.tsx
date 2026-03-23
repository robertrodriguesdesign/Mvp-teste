import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zei — Inteligência de Preços do Bairro",
  description: "Registre preços, recrute sua rede e ganhe dinheiro real.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-100 min-h-screen antialiased">
        <div className="app-shell">
          {children}
        </div>
      </body>
    </html>
  );
}
