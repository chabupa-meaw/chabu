'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function SalesHistoryPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchSalesHistory = async () => {
    setLoading(true)
    const now = new Date()
    let startISO = ''
    let endISO = ''

    if (filterType === 'today') {
      startISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString()
      endISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
    } else if (filterType === 'month') {
      startISO = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString()
      endISO = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    } else if (filterType === 'year') {
      startISO = new Date(now.getFullYear(), 0, 1, 0, 0, 0).toISOString()
      endISO = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString()
    } else if (filterType === 'custom') {
      if (!startDate || !endDate) {
        setLoading(false)
        return alert('กรุณาเลือกวันที่เริ่มต้นและวันที่สิ้นสุด')
      }
      startISO = new Date(`${startDate}T00:00:00`).toISOString()
      endISO = new Date(`${endDate}T23:59:59`).toISOString()
    }

    const { data } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: false })

    if (data) setOrders(data)
    setLoading(false)
  }

  useEffect(() => {
    if (filterType !== 'custom') {
      fetchSalesHistory()
    }
  }, [filterType])

  const totalRevenue = orders.reduce((sum, order) => sum + (order.total_price || 0), 0)
  const totalOrders = orders.length
  const totalItemsSold = orders.reduce((sum, order) => {
    const items = Array.isArray(order.items) ? order.items : []
    return sum + items.reduce((itemSum, item) => itemSum + (item.qty || 0), 0)
  }, 0)

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shadow">
        <h1 className="text-xl font-bold">📊 สรุปยอดขายและประวัติการสั่งซื้อ</h1>
        <nav className="flex gap-3 text-sm font-medium">
          <Link href="/pos" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">หน้าคิดเงิน (POS)</Link>
          <Link href="/admin/menu" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">จัดการเมนู</Link>
          <Link href="/history" className="bg-orange-500 px-4 py-2 rounded text-white">สรุปยอดขาย</Link>
        </nav>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white p-4 rounded-xl shadow mb-6 flex flex-wrap items-end gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('today')}
              className={`px-4 py-2 rounded-lg font-bold ${filterType === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              วันนี้ (รายวัน)
            </button>
            <button
              onClick={() => setFilterType('month')}
              className={`px-4 py-2 rounded-lg font-bold ${filterType === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              เดือนนี้ (รายเดือน)
            </button>
            <button
              onClick={() => setFilterType('year')}
              className={`px-4 py-2 rounded-lg font-bold ${filterType === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              ปีนี้ (รายปี)
            </button>
            <button
              onClick={() => setFilterType('custom')}
              className={`px-4 py-2 rounded-lg font-bold ${filterType === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              📅 กำหนดวันที่เอง
            </button>
          </div>

          {filterType === 'custom' && (
            <div className="flex flex-wrap items-end gap-3 border-l pl-4 border-gray-200">
              <div>
                <label className="block text-xs text-gray-500 mb-1">ตั้งแต่วันที่</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border p-2 rounded-lg text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">ถึงวันที่</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border p-2 rounded-lg text-sm text-black"
                />
              </div>
              <button
                onClick={fetchSalesHistory}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-bold"
              >
                🔍 ค้นหา
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
            <p className="text-sm text-gray-500 font-semibold">💰 ยอดขายรวมทั้งหมด</p>
            <p className="text-3xl font-black text-green-600 mt-2">{totalRevenue.toLocaleString()} บาท</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
            <p className="text-sm text-gray-500 font-semibold">🧾 จำนวนคิว / บิลทั้งหมด</p>
            <p className="text-3xl font-black text-blue-600 mt-2">{totalOrders.toLocaleString()} คิว</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border-l-4 border-orange-500">
            <p className="text-sm text-gray-500 font-semibold">🍢 จำนวนไม้และซุปที่ขายได้</p>
            <p className="text-3xl font-black text-orange-600 mt-2">{totalItemsSold.toLocaleString()} รายการ</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-700">รายการบิลย้อนหลัง ({orders.length} รายการ)</h2>
            {loading && <span className="text-sm text-blue-600 font-medium">กำลังโหลดข้อมูล...</span>}
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b text-sm text-gray-600">
                <th className="p-4">วัน-เวลา</th>
                <th className="p-4">คิวที่</th>
                <th className="p-4">รายการที่สั่ง</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4 text-right">ยอดสุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400">
                    ไม่พบข้อมูลยอดขายในช่วงเวลาที่เลือก
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50 text-sm">
                    <td className="p-4 text-gray-600">
                      {new Date(order.created_at).toLocaleString('th-TH', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="p-4 font-black text-gray-800">
                      Q{String(order.queue_number).padStart(2, '0')}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(order.items) &&
                          order.items.map((item, idx) => (
                            <span key={idx} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs border font-medium">
                              {item.name} x{item.qty}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-gray-200 text-gray-700">
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-extrabold text-green-600 text-base">
                      {order.total_price?.toLocaleString()} ฿
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
