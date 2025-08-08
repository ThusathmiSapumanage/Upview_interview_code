"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from "recharts";

export type CashPoint = { month: string; income: number; expense: number };

export default function CashflowChart({ data }: { data: CashPoint[] }) {
  return (
    <div style={{ width: "100%", height: 380 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(v: any) => Number(v).toFixed(2)} />
          <Legend />
          <Bar dataKey="income" name="Income" />
          <Bar dataKey="expense" name="Expense" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
