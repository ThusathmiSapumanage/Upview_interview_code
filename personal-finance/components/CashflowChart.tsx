"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export type CashPoint = { month: string; income: number; expense: number };

export default function CashflowChart({ data }: { data: CashPoint[] }) {
  return (
    <div style={{ width: "100%", height: 380 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(15,23,42,0.08)" />
          <XAxis dataKey="month" tick={{ fill: "#475569" }} stroke="#cbd5e1" />
          <YAxis tick={{ fill: "#475569" }} stroke="#cbd5e1" />
          <Tooltip
            contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb" }}
            labelStyle={{ color: "#0f172a" }}
            formatter={(v: any) => Number(v).toFixed(2)}
          />
          <Legend />
          <Bar dataKey="income" name="Income" fill="#22c55e" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expense" name="Expense" fill="#f97316" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
