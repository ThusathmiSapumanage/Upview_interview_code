"use client";

import { useState } from "react";
import { Card, Form, Input, Button, message, Typography } from "antd";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isSignup, setIsSignup] = useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            if (isSignup) {
                const { error } = await supabase.auth.signUp({
                    email: values.email,
                    password: values.password,
                    options: { data: { full_name: values.fullName || null } },
                });
                if (error) throw error;
                message.success("Account created. Sign in now.");
                setIsSignup(false);
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: values.email,
                    password: values.password,
                });
                if (error) throw error;

                // Inserted code here
                const { data: { user } } = await supabase.auth.getUser();
                const { data: prof } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();

                message.success("Welcome!");
                router.push("/");
            }
        } catch (e: any) {
            message.error(e.message || "Auth failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
            <Card style={{ width: 380, background: "#121a2b", border: "1px solid #1f2a44" }}>
                <Typography.Title level={3} style={{ color: "#fff", marginBottom: 16 }}>
                    {isSignup ? "Create account" : "Sign in"}
                </Typography.Title>
                <Form layout="vertical" onFinish={onFinish}>
                    {isSignup && <Form.Item label="Full name" name="fullName"><Input placeholder="Jane Doe" /></Form.Item>}
                    <Form.Item label="Email" name="email" rules={[{ required: true }, { type: "email" }]}>
                        <Input placeholder="you@example.com" />
                    </Form.Item>
                    <Form.Item label="Password" name="password" rules={[{ required: true, min: 6 }]}>
                        <Input.Password placeholder="••••••••" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                        {isSignup ? "Sign up" : "Sign in"}
                    </Button>
                </Form>
                <div style={{ marginTop: 12, color: "#c7d0e0" }}>
                    {isSignup ? "Already have an account?" : "New here?"}{" "}
                    <a style={{ color: "#73b8ff", cursor: "pointer" }} onClick={() => setIsSignup(!isSignup)}>
                        {isSignup ? "Sign in" : "Create one"}
                    </a>
                </div>
            </Card>
        </div>
    );
}
