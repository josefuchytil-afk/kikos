export const metadata = {
  title: "Kikoš",
  description: "Kryštofův checklist",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
