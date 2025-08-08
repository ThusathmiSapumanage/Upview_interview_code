"use client";

import { useEffect, useState } from "react";
import { Layout, Menu, Dropdown, Avatar, Space, Typography, Button } from "antd";
import {
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  TableOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProfileAvatar from "@/components/ProfileAvatar";

const { Header, Sider, Content } = Layout;

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, height: 56 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "#0f172a",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        S
      </div>
      {!collapsed && (
        <Typography.Text strong style={{ color: "#0f172a" }}>
          Personal Finance
        </Typography.Text>
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // avatar state
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setEmail(user?.email ?? null);

      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        setAvatarUrl(prof?.avatar_url || undefined);
      }
    })();
  }, []);

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const menuItems = [
    { key: "/", icon: <HomeOutlined />, label: "Home", onClick: () => router.push("/") },
    { key: "/transactions", icon: <TableOutlined />, label: "Transactions", onClick: () => router.push("/transactions") },
  ];

  const userMenu = {
    items: [
      { key: "email", label: email || "Signed in", disabled: true },
      { key: "change_photo", label: "Change photo", onClick: () => setAvatarOpen(true) },
      { type: "divider" as const },
      { key: "logout", icon: <LogoutOutlined />, label: "Logout", onClick: onLogout },
    ],
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f7fb" }}>
      <Sider collapsible={false} collapsed={collapsed} trigger={null} width={200} style={{ background: "#fff" }}>
        <Brand collapsed={collapsed} />
        <Menu
          mode="inline"
          theme="light"
          selectedKeys={[pathname || "/"]}
          items={menuItems.map((m) => ({
            key: m.key,
            icon: m.icon,
            label: collapsed ? null : m.label,
            onClick: () => m.onClick(),
          }))}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingInline: 16,
            gap: 12,
          }}
        >
          <Space>
            <Button
              aria-label="Toggle sidebar"
              onClick={() => setCollapsed((c) => !c)}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            />
            <Typography.Title level={4} style={{ margin: 0, color: "#0f172a" }}>
              Personal Finance
            </Typography.Title>
          </Space>

          <Dropdown menu={userMenu} trigger={["click"]}>
            <Space style={{ color: "#0f172a", cursor: "pointer" }}>
              <Avatar src={avatarUrl} icon={<UserOutlined />} />
              <span>{email || "Account"}</span>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ padding: 24 }}>{children}</Content>
      </Layout>

      {/* Profile photo modal */}
      <ProfileAvatar
        open={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        onChanged={(url) => setAvatarUrl(url)}
      />
    </Layout>
  );
}
