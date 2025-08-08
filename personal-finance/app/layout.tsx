import ClientLayout from "../components/ClientLayout";

export const metadata = {
  title: "Personal Finance",
  description: "Next.js + Supabase",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f5f7fb", color: "#0f172a", fontFamily: "Inter, system-ui, Arial" }}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
