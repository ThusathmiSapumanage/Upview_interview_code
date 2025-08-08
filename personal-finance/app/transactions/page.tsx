"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  message,
  Typography,
} from "antd";
import {
  DollarCircleOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

type Tx = {
  id: string;
  user_id: string;
  title: string;
  // legacy field (kept for back-compat, we show amount_base instead)
  amount: number;
  category: string | null;
  type: "income" | "expense";
  notes: string | null;
  date: string; // ISO

  // currency fields
  currency_code: string;   // original currency (e.g., USD)
  amount_original: number; // amount in original currency
  fx_rate: number;         // original -> LKR rate
  amount_base: number;     // converted amount in LKR
};

const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Salary", "Other"];
const ISO_CURRENCIES = ["LKR", "USD", "EUR", "GBP", "INR", "AUD", "CAD", "JPY", "SGD", "AED"];

export default function TransactionsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [baseCurrency, setBaseCurrency] = useState<string>("LKR");
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [cat, setCat] = useState<string | null>(null);
  const [type, setType] = useState<"income" | "expense" | null>(null);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [q, setQ] = useState("");

  // modals/forms
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // live FX preview
  const [addFxRate, setAddFxRate] = useState<number>(1);
  const [editFxRate, setEditFxRate] = useState<number>(1);

  // watch add/edit form fields
  const addCurrency = Form.useWatch("currency_code", form);
  const addDate = Form.useWatch("date", form);
  const addAmount = Form.useWatch("amount_original", form);

  const editCurrency = Form.useWatch("currency_code", editForm);
  const editDate = Form.useWatch("date", editForm);
  const editAmount = Form.useWatch("amount_original", editForm);

  useEffect(() => {
    (async () => {
      const { data: a } = await supabase.auth.getUser();
      if (!a?.user) { location.href = "/login"; return; }
      setUserId(a.user.id);

      const { data: prof } = await supabase
        .from("profiles")
        .select("base_currency")
        .eq("id", a.user.id)
        .maybeSingle();
      setBaseCurrency((prof?.base_currency || "LKR").toUpperCase());
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchRows();
    const ch = supabase
      .channel("tx_changes_list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
        fetchRows
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, cat, type, JSON.stringify(range), q]);

  async function fetchRows() {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });
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
      setRows(filtered);
    } catch (e: any) {
      message.error(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  // group by month label like "Dec 2023"
  const groups = useMemo(() => {
    const map = new Map<string, Tx[]>();
    rows.forEach(r => {
      const key = dayjs(r.date).format("MMM YYYY");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    const sorted = Array.from(map.entries()).sort((a, b) => {
      const da = dayjs(a[0], "MMM YYYY").valueOf();
      const db = dayjs(b[0], "MMM YYYY").valueOf();
      return db - da;
    });
    return sorted;
  }, [rows]);

  // FX helper hitting our API
  async function fetchFx(from: string, to: string, dateISO?: string) {
    const f = (from || "").toUpperCase();
    const t = (to || "").toUpperCase();
    if (!f || !t || f === t) return 1;
    const qs = new URLSearchParams({ from: f, to: t });
    if (dateISO) qs.set("date", dateISO.slice(0, 10));
    const r = await fetch(`/api/fx?${qs.toString()}`);
    const j = await r.json();
    return Number(j?.rate || 1);
  }

  // open modals
  function openAdd() {
    form.resetFields();
    form.setFieldsValue({
      date: dayjs(),
      type: "expense",
      currency_code: baseCurrency, // default to LKR
    });
    setAddFxRate(1);
    setIsAddOpen(true);
  }

  function openEdit(tx: Tx) {
    setEditing(tx);
    editForm.setFieldsValue({
      title: tx.title,
      type: tx.type,
      category: tx.category || undefined,
      notes: tx.notes || undefined,
      date: dayjs(tx.date),
      currency_code: (tx.currency_code || baseCurrency).toUpperCase(),
      amount_original: Number(tx.amount_original || 0),
    });
    setEditFxRate(tx.fx_rate || 1);
    setIsEditOpen(true);
  }

  // recompute FX (Add)
  useEffect(() => {
    const curr = (addCurrency || baseCurrency)?.toUpperCase();
    const dateISO = addDate ? (addDate as Dayjs).toISOString() : undefined;
    if (!curr) return;
    (async () => {
      const rate = await fetchFx(curr, baseCurrency, dateISO);
      setAddFxRate(rate);
    })();
  }, [addCurrency, addDate, baseCurrency]);

  // recompute FX (Edit)
  useEffect(() => {
    const curr = (editCurrency || baseCurrency)?.toUpperCase();
    const dateISO = editDate ? (editDate as Dayjs).toISOString() : undefined;
    if (!curr) return;
    (async () => {
      const rate = await fetchFx(curr, baseCurrency, dateISO);
      setEditFxRate(rate);
    })();
  }, [editCurrency, editDate, baseCurrency]);

  // submit handlers
  async function handleAdd(values: any) {
    if (!userId) return;
    try {
      const dateISO = (values.date as Dayjs).toISOString();
      const from = String(values.currency_code || baseCurrency).toUpperCase();
      const rate = from === baseCurrency ? 1 : await fetchFx(from, baseCurrency, dateISO);
      const amountOriginal = Number(values.amount_original);
      const amountBase = amountOriginal * rate;

      const payload = {
        user_id: userId,
        title: values.title,
        category: values.category || null,
        type: values.type,
        notes: values.notes || null,
        date: dateISO,

        currency_code: from,
        amount_original: amountOriginal,
        fx_rate: rate,
        amount_base: amountBase,

        // keep legacy "amount" aligned to base for back-compat queries
        amount: amountBase,
      };

      const { error } = await supabase.from("transactions").insert(payload);
      if (error) throw error;
      message.success("Added");
      setIsAddOpen(false);
      form.resetFields();
    } catch (e: any) {
      message.error(e.message || "Add failed");
    }
  }

  async function handleEdit(values: any) {
    if (!editing) return;
    try {
      const dateISO = (values.date as Dayjs).toISOString();
      const from = String(values.currency_code || baseCurrency).toUpperCase();
      const rate = from === baseCurrency ? 1 : await fetchFx(from, baseCurrency, dateISO);
      const amountOriginal = Number(values.amount_original);
      const amountBase = amountOriginal * rate;

      const payload = {
        title: values.title,
        category: values.category || null,
        type: values.type,
        notes: values.notes || null,
        date: dateISO,

        currency_code: from,
        amount_original: amountOriginal,
        fx_rate: rate,
        amount_base: amountBase,

        amount: amountBase,
      };

      const { error } = await supabase.from("transactions").update(payload).eq("id", editing.id);
      if (error) throw error;
      message.success("Updated");
      setIsEditOpen(false);
      setEditing(null);
    } catch (e: any) {
      message.error(e.message || "Update failed");
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      message.success("Deleted");
    } catch (e: any) {
      message.error(e.message || "Delete failed");
    }
  }

  return (
    <Card style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
      {/* Filters (kept) */}
      <Space align="center" wrap style={{ width: "100%", marginBottom: 12, justifyContent: "space-between" }}>
        <Space wrap>
          <Select
            placeholder="Category"
            style={{ width: 160 }}
            allowClear
            onChange={(v) => setCat(v || null)}
            options={CATEGORIES.map(c => ({ value: c, label: c }))}
          />
          <Select
            placeholder="Type"
            style={{ width: 140 }}
            allowClear
            onChange={(v) => setType(v || null)}
            options={[{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }]}
          />
          <DatePicker.RangePicker onChange={(vals) => setRange(vals as any)} />
          <Input
            placeholder="Search title/notes/category"
            style={{ width: 260 }}
            onChange={(e) => setQ(e.target.value)}
          />
        </Space>
        <Button type="primary" onClick={openAdd}>Add</Button>
      </Space>

      <Divider style={{ borderColor: "#e5e7eb", margin: "8px 0 12px" }} />

      {/* Grouped list */}
      {loading && <Typography.Text>Loading…</Typography.Text>}
      {!loading && groups.length === 0 && (
        <Typography.Text type="secondary">No transactions yet.</Typography.Text>
      )}

      {!loading && groups.map(([monthLabel, items]) => (
        <div key={monthLabel} style={{ marginBottom: 16 }}>
          <Typography.Title level={5} style={{ margin: 0, marginBottom: 8 }}>{monthLabel}</Typography.Title>
          <List
            dataSource={items}
            renderItem={(item) => {
              const isIncome = item.type === "income";
              const amt = Number(item.amount_base || 0);
              const color = isIncome ? "#16a34a" : "#ef4444";
              const Icon = isIncome ? DollarCircleOutlined : MinusCircleOutlined;

              return (
                <List.Item
                  style={{ padding: "10px 0", borderBlockEnd: "1px solid #f1f5f9" }}
                  actions={[
                    <Button key="edit" size="small" onClick={() => openEdit(item)}>Edit</Button>,
                    <Popconfirm key="del" title="Delete this transaction?" onConfirm={() => handleDelete(item.id)}>
                      <Button size="small" danger>Delete</Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Icon style={{ fontSize: 20, color }} />}
                    title={
                      <Space size={8} wrap>
                        <Typography.Text>{dayjs(item.date).format("D MMMM YYYY")}</Typography.Text>
                        <Tag color={isIncome ? "green" : "red"} style={{ textTransform: "lowercase" }}>
                          {item.type}
                        </Tag>
                        <Typography.Text type="secondary">
                          {`${item.category || "—"}`}{item.title ? ` • ${item.title}` : ""}
                        </Typography.Text>
                      </Space>
                    }
                    description={
                      (item.currency_code && item.currency_code.toUpperCase() !== baseCurrency) ? (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {Number(item.amount_original).toFixed(2)} {item.currency_code} @ {Number(item.fx_rate).toFixed(4)}
                        </Typography.Text>
                      ) : null
                    }
                  />
                  <div style={{ minWidth: 160, textAlign: "right", color }}>
                    {isIncome ? "+ " : "- "}{amt.toFixed(2)} {baseCurrency}
                  </div>
                </List.Item>
              );
            }}
          />
        </div>
      ))}

      {/* Add Modal */}
      <Modal
        title="Add transaction"
        open={isAddOpen}
        onCancel={() => setIsAddOpen(false)}
        onOk={() => form.submit()}
      >
        <Form
          layout="vertical"
          form={form}
          onFinish={handleAdd}
          initialValues={{ type: "expense", date: dayjs(), currency_code: baseCurrency }}
        >
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>

          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={[{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} />
          </Form.Item>

          <Form.Item label="Amount (original)" required style={{ marginBottom: 8 }}>
            <Space.Compact style={{ width: "100%" }}>
              <Form.Item name="amount_original" noStyle rules={[{ required: true, message: "Enter amount" }]}>
                <InputNumber style={{ width: "100%" }} min={0} placeholder="Amount" />
              </Form.Item>
              <Form.Item name="currency_code" noStyle initialValue={baseCurrency}>
                <Select style={{ width: 110 }} options={ISO_CURRENCIES.map(c => ({ value: c, label: c }))} />
              </Form.Item>
            </Space.Compact>
          </Form.Item>

          <Form.Item name="date" label="Date" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label={`Amount in ${baseCurrency}`} tooltip="Converted using the selected date's rate">
            <InputNumber
              disabled
              style={{ width: "100%" }}
              value={(() => {
                const v = Number(addAmount || 0);
                if (!Number.isFinite(v)) return undefined;
                return v * addFxRate;
              })()}
            />
          </Form.Item>

          <Form.Item name="category" label="Category">
            <Select allowClear options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          </Form.Item>

          <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit transaction"
        open={isEditOpen}
        onCancel={() => setIsEditOpen(false)}
        onOk={() => editForm.submit()}
      >
        <Form layout="vertical" form={editForm} onFinish={handleEdit}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>

          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={[{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} />
          </Form.Item>

          <Form.Item label="Amount (original)" required style={{ marginBottom: 8 }}>
            <Space.Compact style={{ width: "100%" }}>
              <Form.Item name="amount_original" noStyle rules={[{ required: true, message: "Enter amount" }]}>
                <InputNumber style={{ width: "100%" }} min={0} placeholder="Amount" />
              </Form.Item>
              <Form.Item name="currency_code" noStyle>
                <Select style={{ width: 110 }} options={ISO_CURRENCIES.map(c => ({ value: c, label: c }))} />
              </Form.Item>
            </Space.Compact>
          </Form.Item>

          <Form.Item name="date" label="Date" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label={`Amount in ${baseCurrency}`} tooltip="Converted using the selected date's rate">
            <InputNumber
              disabled
              style={{ width: "100%" }}
              value={(() => {
                const v = Number(editAmount || 0);
                if (!Number.isFinite(v)) return undefined;
                return v * editFxRate;
              })()}
            />
          </Form.Item>

          <Form.Item name="category" label="Category">
            <Select allowClear options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          </Form.Item>

          <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
