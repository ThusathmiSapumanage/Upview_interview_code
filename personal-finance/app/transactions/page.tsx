"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select,
  Space, Tag, Popconfirm, message, Card, Divider
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

type Tx = { id: string; user_id: string; title: string; amount: number; category: string | null; type: "income" | "expense"; notes: string | null; date: string; };
const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Salary", "Other"];

export default function TransactionsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);

  const [cat, setCat] = useState<string | null>(null);
  const [type, setType] = useState<"income" | "expense" | null>(null);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [q, setQ] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: a }) => {
      if (!a?.user) location.href = "/login"; else setUserId(a.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchRows();
    const ch = supabase.channel("tx_changes_list")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` }, fetchRows)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, cat, type, JSON.stringify(range), q]);

  async function fetchRows() {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase.from("transactions").select("*").order("date", { ascending: false });
      if (error) throw error;

      let filtered = (rows || []) as Tx[];
      if (cat) filtered = filtered.filter(r => r.category === cat);
      if (type) filtered = filtered.filter(r => r.type === type);
      if (range) {
        const [s, e] = range;
        filtered = filtered.filter(r => {
          const d = dayjs(r.date);
          return d.isAfter(s.startOf("day")) && d.isBefore(e.endOf("day"));
        });
      }
      if (q.trim()) {
        const t = q.toLowerCase();
        filtered = filtered.filter(r =>
          r.title.toLowerCase().includes(t) ||
          (r.notes || "").toLowerCase().includes(t) ||
          (r.category || "").toLowerCase().includes(t)
        );
      }
      setData(filtered);
    } catch (e: any) {
      message.error(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    { title: "Title", dataIndex: "title" },
    { title: "Type", dataIndex: "type", render: (t: Tx["type"]) => <Tag color={t === "income" ? "green" : "red"}>{t}</Tag> },
    { title: "Category", dataIndex: "category" },
    { title: "Amount", dataIndex: "amount", render: (v: number, r: Tx) =>
        <span style={{ color: r.type === "income" ? "#16a34a" : "#ef4444" }}>
          {r.type === "income" ? "+" : "-"} {Number(v).toFixed(2)}
        </span> },
    { title: "Date", dataIndex: "date", render: (d: string) => dayjs(d).format("YYYY-MM-DD") },
    { title: "Actions", key: "actions", render: (_: any, rec: Tx) => (
      <Space>
        <Button size="small" onClick={() => openEdit(rec)}>Edit</Button>
        <Popconfirm title="Delete this transaction?" onConfirm={() => handleDelete(rec.id)}>
          <Button size="small" danger>Delete</Button>
        </Popconfirm>
      </Space>
    )},
  ];

  function openAdd() {
    form.resetFields();
    form.setFieldsValue({ date: dayjs(), type: "expense" });
    setIsAddOpen(true);
  }
  function openEdit(tx: Tx) {
    setEditing(tx);
    editForm.setFieldsValue({
      title: tx.title, amount: Number(tx.amount), category: tx.category || undefined,
      type: tx.type, notes: tx.notes || undefined, date: dayjs(tx.date),
    });
    setIsEditOpen(true);
  }

  async function handleAdd(values: any) {
    if (!userId) return;
    try {
      const payload = { user_id: userId, title: values.title, amount: Number(values.amount),
        category: values.category || null, type: values.type, notes: values.notes || null,
        date: (values.date as Dayjs).toISOString() };
      const { error } = await supabase.from("transactions").insert(payload);
      if (error) throw error;
      message.success("Added"); setIsAddOpen(false); form.resetFields();
    } catch (e: any) { message.error(e.message || "Add failed"); }
  }

  async function handleEdit(values: any) {
    if (!editing) return;
    try {
      const payload = { title: values.title, amount: Number(values.amount), category: values.category || null,
        type: values.type, notes: values.notes || null, date: (values.date as Dayjs).toISOString() };
      const { error } = await supabase.from("transactions").update(payload).eq("id", editing.id);
      if (error) throw error;
      message.success("Updated"); setIsEditOpen(false); setEditing(null);
    } catch (e: any) { message.error(e.message || "Update failed"); }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      message.success("Deleted");
    } catch (e: any) { message.error(e.message || "Delete failed"); }
  }

  return (
    <Card style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
      <Space align="center" wrap style={{ width: "100%", marginBottom: 12 }}>
        <Select placeholder="Category" style={{ width: 160 }} allowClear onChange={(v) => setCat(v || null)}
                options={CATEGORIES.map(c => ({ value: c, label: c }))}/>
        <Select placeholder="Type" style={{ width: 140 }} allowClear onChange={(v) => setType(v || null)}
                options={[{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} />
        <DatePicker.RangePicker onChange={(vals) => setRange(vals as any)} />
        <Input placeholder="Search title/notes/category" style={{ width: 260 }} onChange={(e) => setQ(e.target.value)} />
        <Button type="primary" onClick={openAdd}>Add transaction</Button>
      </Space>
      <Divider style={{ borderColor: "#e5e7eb", margin: "8px 0 16px" }} />
      <Table dataSource={data} columns={columns as any} loading={loading}
             rowKey="id" style={{ background: "#fff", borderRadius: 8 }} pagination={{ pageSize: 8 }} />

      <Modal title="Add transaction" open={isAddOpen} onCancel={() => setIsAddOpen(false)} onOk={() => form.submit()}>
        <Form layout="vertical" form={form} onFinish={handleAdd} initialValues={{ type: "expense", date: dayjs() }}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={[{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="category" label="Category"><Select allowClear options={CATEGORIES.map(c => ({ value: c, label: c }))} /></Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Edit transaction" open={isEditOpen} onCancel={() => setIsEditOpen(false)} onOk={() => editForm.submit()}>
        <Form layout="vertical" form={editForm} onFinish={handleEdit}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}><Select options={[{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} /></Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="category" label="Category"><Select allowClear options={CATEGORIES.map(c => ({ value: c, label: c }))} /></Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
