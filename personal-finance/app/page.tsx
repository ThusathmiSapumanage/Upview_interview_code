"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, Select, Space, Statistic, Typography, message } from "antd";
import dayjs from "dayjs";
import CashflowChart, { CashPoint } from "@/components/CashflowChart";

type Tx = {
  id: string; user_id: string;
  title: string; amount: number;
  category: string | null;
  type: "income" | "expense";
  notes: string | null;
  date: string;
};

export default function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const currentYear = dayjs().year();
  const [year, setYear] = useState<number>(currentYear);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) location.href = "/login";
      else setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchAll();
    const ch = supabase
      .channel("tx_changes_dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function fetchAll() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false });
      if (error) throw error;
      setRows((data || []) as Tx[]);
    } catch (e: any) {
      message.error(e.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }

  const { incomeTotal, expenseTotal, balance } = useMemo(() => {
    const inSum = rows.filter(r => r.type === "income").reduce((s, r) => s + Number(r.amount || 0), 0);
    const exSum = rows.filter(r => r.type === "expense").reduce((s, r) => s + Number(r.amount || 0), 0);
    return { incomeTotal: inSum, expenseTotal: exSum, balance: inSum - exSum };
  }, [rows]);

  const chartData: CashPoint[] = useMemo(() => {
    const months = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
    rows.forEach(r => {
      const d = dayjs(r.date);
      if (d.year() !== year) return;
      const m = d.month();
      if (r.type === "income") months[m].income += Number(r.amount || 0);
      else months[m].expense += Number(r.amount || 0);
    });
    return months.map((m, i) => ({
      month: dayjs().month(i).format("MMM") + " " + year,
      income: Number(m.income.toFixed(2)),
      expense: Number(m.expense.toFixed(2)),
    }));
  }, [rows, year]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Space style={{ width: "100%", marginBottom: 16 }} size="large">
        <Card style={{ flex: 1, background: "#ffffff", border: "1px solid #e5e7eb" }}>
          <Statistic title={<span style={{ color: "#475569" }}>Income</span>} value={incomeTotal} precision={2} loading={loading} />
        </Card>
        <Card style={{ flex: 1, background: "#ffffff", border: "1px solid #e5e7eb" }}>
          <Statistic title={<span style={{ color: "#475569" }}>Expenses</span>} value={expenseTotal} precision={2} loading={loading} />
        </Card>
        <Card style={{ flex: 1, background: "#ffffff", border: "1px solid #e5e7eb" }}>
          <Statistic title={<span style={{ color: "#475569" }}>Balance</span>} value={balance} precision={2} loading={loading} />
        </Card>
      </Space>

      <Card
        style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography.Text style={{ color: "#0f172a", fontWeight: 600 }}>Cashflow</Typography.Text>
            <Select
              style={{ width: 140 }}
              value={year}
              onChange={setYear}
              options={[currentYear - 2, currentYear - 1, currentYear].map(y => ({ value: y, label: y }))}
            />
          </div>
        }
      >
        <CashflowChart data={chartData} />
      </Card>
    </div>
  );
}
