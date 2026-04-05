export const metadata = {
  title: "Kikoš",
  description: "Kryštofův checklist",
};

export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
