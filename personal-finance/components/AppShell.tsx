"use client";

import { Layout, Menu, Avatar, Dropdown, Space, Typography } from "antd";
import { LogoutOutlined, UserOutlined, DashboardOutlined, TableOutlined } from "@ant-design/icons";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const { Header, Sider, Content } = Layout;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const menuItems = [
  { key: "/", label: "Dashboard", icon: <DashboardOutlined />, onClick: () => router.push("/") },
  { key: "/transactions", label: "Transactions", icon: <TableOutlined />, onClick: () => router.push("/transactions") },
];

  const userMenu = {
    items: [
      { key: "email", label: email || "Signed in", disabled: true },
      { type: "divider" as const },
      { key: "logout", icon: <LogoutOutlined />, label: "Logout", onClick: onLogout },
    ],
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#0B1220" }}>
      <Sider width={220} style={{ background: "#0E1730", borderRight: "1px solid #1f2a44" }}>
        <div style={{ padding: 16, color: "#9fb3d9", fontWeight: 600, fontSize: 18 }}>💸 Finance</div>
        <Menu
          theme="dark"
          selectedKeys={[pathname || "/"]}
          items={menuItems}
          onClick={({ key }) => {
            const item = menuItems.find(i => i.key === key);
            item?.onClick?.();
          }}
          style={{ background: "transparent" }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: "#0E1730",
          borderBottom: "1px solid #1f2a44",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: 16
        }}>
          <Typography.Title level={4} style={{ color: "#E6EAF2", margin: 0 }}>Personal Finance</Typography.Title>
          <Dropdown menu={userMenu} trigger={["click"]}>
            <Space style={{ color: "#E6EAF2", cursor: "pointer" }}>
              <Avatar icon={<UserOutlined />} />
              <span>{email || "Account"}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
