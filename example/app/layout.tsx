import { TesseralProvider } from "../../src/serverside";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TesseralProvider>{children}</TesseralProvider>
      </body>
    </html>
  );
}
