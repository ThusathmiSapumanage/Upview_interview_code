"use client";

import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select } from 'antd'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  useEffect(() => {
    fetchTransactions()
  }, [filterCategory])

  async function fetchTransactions() {
    setLoading(true)
    let query = supabase.from('transactions').select('*').order('date', { ascending: false })
    if (filterCategory) query = query.eq('category', filterCategory)
    const { data } = await query
    setTransactions(data || [])
    setLoading(false)
  }

  const handleAdd = () => setIsModalOpen(true)
  const handleCancel = () => setIsModalOpen(false)

  const handleSubmit = async (values: any) => {
    await supabase.from('transactions').insert({
      title: values.title,
      amount: values.amount,
      category: values.category,
      date: values.date.toISOString()
    })
    setIsModalOpen(false)
    form.resetFields()
    fetchTransactions()
  }

  const columns = [
    { title: 'Title', dataIndex: 'title' },
    { title: 'Amount', dataIndex: 'amount' },
    { title: 'Category', dataIndex: 'category' },
    { title: 'Date', dataIndex: 'date', render: (d: string) => dayjs(d).format('YYYY-MM-DD') }
  ]

  return (
    <div style={{ padding: 20 }}>
      <h1>Personal Finance Tracker</h1>
      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="Filter by category"
          style={{ width: 200, marginRight: 8 }}
          allowClear
          onChange={value => setFilterCategory(value || null)}
        >
          <Select.Option value="Food">Food</Select.Option>
          <Select.Option value="Transport">Transport</Select.Option>
          <Select.Option value="Shopping">Shopping</Select.Option>
        </Select>
        <Button type="primary" onClick={handleAdd}>Add Transaction</Button>
      </div>
      <Table dataSource={transactions} columns={columns} loading={loading} rowKey="id" />

      <Modal title="Add Transaction" open={isModalOpen} onCancel={handleCancel} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Select>
              <Select.Option value="Food">Food</Select.Option>
              <Select.Option value="Transport">Transport</Select.Option>
              <Select.Option value="Shopping">Shopping</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
