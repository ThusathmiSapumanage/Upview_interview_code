import AppShell from "@/components/AppShell";

export const metadata = {
  title: "Personal Finance",
  description: "Next.js + Supabase",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0B1220", color: "#E6EAF2", fontFamily: "Inter, system-ui, Arial" }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
