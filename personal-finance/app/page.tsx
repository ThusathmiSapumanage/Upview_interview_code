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
  date: string; // ISO
};

export default function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const currentYear = dayjs().year();
  const [year, setYear] = useState<number>(currentYear);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        window.location.href = "/login";
        return;
      }
      setUserId(data.user.id);
    })();
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
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      setRows((data || []) as Tx[]);
    } catch (e: any) {
      message.error(e.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }

  // summary
  const { incomeTotal, expenseTotal, balance } = useMemo(() => {
    const inSum = rows.filter(r => r.type === "income").reduce((s, r) => s + Number(r.amount || 0), 0);
    const exSum = rows.filter(r => r.type === "expense").reduce((s, r) => s + Number(r.amount || 0), 0);
    return { incomeTotal: inSum, expenseTotal: exSum, balance: inSum - exSum };
  }, [rows]);

  // chart data for selected year
  const chartData: CashPoint[] = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({ income: 0, expense: 0 }));
    rows.forEach(r => {
      const d = dayjs(r.date);
      if (d.year() !== year) return;
      const m = d.month(); // 0..11
      if (r.type === "income") months[m].income += Number(r.amount || 0);
      else months[m].expense += Number(r.amount || 0);
    });
    return months.map((m, i) => ({
      month: `${dayjs().month(i).format("MMM")} ${year}`,
      income: Number(m.income.toFixed(2)),
      expense: Number(m.expense.toFixed(2)),
    }));
  }, [rows, year]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Space style={{ width: "100%", marginBottom: 16 }} size="large">
        <Card style={{ flex: 1, background: "#121a2b", border: "1px solid #1f2a44" }}>
          <Statistic title={<span style={{ color: "#c7d0e0" }}>Income</span>} value={incomeTotal} precision={2} loading={loading} />
        </Card>
        <Card style={{ flex: 1, background: "#121a2b", border: "1px solid #1f2a44" }}>
          <Statistic title={<span style={{ color: "#c7d0e0" }}>Expenses</span>} value={expenseTotal} precision={2} loading={loading} />
        </Card>
        <Card style={{ flex: 1, background: "#121a2b", border: "1px solid #1f2a44" }}>
          <Statistic title={<span style={{ color: "#c7d0e0" }}>Balance</span>} value={balance} precision={2} loading={loading} />
        </Card>
      </Space>

      <Card style={{ background: "#121a2b", border: "1px solid #1f2a44" }}
            title={<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography.Text style={{ color: "#E6EAF2", fontWeight: 600 }}>Cashflow</Typography.Text>
              <Select
                style={{ width: 140 }}
                value={year}
                onChange={setYear}
                options={[currentYear - 2, currentYear - 1, currentYear].map(y => ({ value: y, label: y }))}
              />
            </div>}>
        <CashflowChart data={chartData} />
      </Card>
    </div>
  );
}
