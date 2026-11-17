'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

const CATEGORIES = [
  { id: 'all', label: '✨ ทั้งหมด', icon: '🍽️' },
  { id: 'skewer', label: 'ชาบูไม้เสียบ', icon: '🍢' },
  { id: 'vegetable', label: 'เมนูผัก', icon: '🥬' },
  { id: 'noodle', label: 'เมนูเส้น', icon: '🍜' },
  { id: 'soup', label: 'น้ำซุป', icon: '🍲' },
]

export default function POSPage() {
  const [menus, setMenus] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cart, setCart] = useState([])
  const [activeOrders, setActiveOrders] = useState([])
  const [nextQueue, setNextQueue] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchMenus()
    fetchTodayOrders()

    const channel = supabase
      .channel('pos-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchTodayOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchMenus = async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('price', { ascending: true })

    if (data) setMenus(data)
  }

  const fetchTodayOrders = async () => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString()

    const { data } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startOfDay)
      .order('queue_number', { ascending: true })

    if (data) {
      const maxQueue = data.reduce((max, o) => (o.queue_number > max ? o.queue_number : max), 0)
      setNextQueue(maxQueue + 1)
      const active = data.filter((o) => o.status !== 'completed')
      setActiveOrders(active)
    }
  }

  const addToCart = (menu) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === menu.id)
      if (existing) {
        return prev.map((item) => (item.id === menu.id ? { ...item, qty: item.qty + 1 } : item))
      }
      return [...prev, { id: menu.id, name: menu.name, price: menu.price, qty: 1, color_code: menu.color_code }]
    })
  }

  const decreaseQty = (id) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0)
    )
  }

  const clearCart = () => setCart([])

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0)

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('กรุณาเลือกรายการอาหารก่อนครับ')
    setLoading(true)

    const orderPayload = {
      queue_number: nextQueue,
      items: cart.map(({ name, price, qty }) => ({ name, price, qty })),
      total_price: totalPrice,
      status: 'cooking',
    }

    const { error } = await supabase.from('orders').insert([orderPayload])
    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } else {
      setCart([])
      fetchTodayOrders()
    }
    setLoading(false)
  }

  const updateOrderStatus = async (id, newStatus) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    fetchTodayOrders()
  }

  const displayedMenus =
    selectedCategory === 'all'
      ? menus
      : menus.filter((m) => m.category === selectedCategory)

  const getCategoryIcon = (cat) => {
    const found = CATEGORIES.find((c) => c.id === cat)
    return found ? found.icon : '🍢'
  }

  return (
    <div className="min-h-screen bg-[#fcf8f2] flex flex-col font-sans text-stone-800">
      <header className="bg-[#4a3b32] text-[#fdfbf7] px-6 py-3.5 flex justify-between items-center shadow-md border-b border-[#3c2f27]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍢</span>
          <div>
            <h1 className="text-lg font-bold tracking-wide text-[#fdfbf7]">ระบบคิดเงินชาบูเสียบไม้</h1>
            <p className="text-xs text-stone-300">Fast POS & Kitchen Queue</p>
          </div>
        </div>
        <nav className="flex gap-2 text-xs font-semibold">
          <Link href="/pos" className="bg-[#c27847] px-4 py-2 rounded-lg text-white shadow-sm">
            หน้าคิดเงิน (POS)
          </Link>
          <Link href="/admin/menu" className="bg-[#5c4a3e] hover:bg-[#6e594b] px-4 py-2 rounded-lg text-stone-200 transition">
            จัดการเมนู
          </Link>
          <Link href="/history" className="bg-[#5c4a3e] hover:bg-[#6e594b] px-4 py-2 rounded-lg text-stone-200 transition">
            สรุปยอดขาย
          </Link>
        </nav>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
        {/* คอลัมน์ซ้าย (7 ส่วน): แท็บเลือกหมวดหมู่ + การ์ดเมนูจัดเรียงลำดับ */}
        <div className="lg:col-span-7 bg-[#fffdfa] p-5 rounded-2xl shadow-sm border border-[#ede3d5] flex flex-col gap-4 overflow-y-auto">
          {/* แถบหมวดหมู่ */}
          <div className="flex flex-wrap gap-2 pb-3 border-b border-[#ede3d5]">
            {CATEGORIES.map((cat) => {
              const count = cat.id === 'all' ? menus.length : menus.filter((m) => m.category === cat.id).length
              const isActive = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition shadow-xs active:scale-95 ${
                    isActive
                      ? 'bg-[#c27847] text-white shadow-sm'
                      : 'bg-[#faf5ed] text-stone-700 hover:bg-[#f0e6d6] border border-[#e5d9c5]'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 ${
                      isActive ? 'bg-black/20 text-white' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* รายการเมนูที่เรียงตาม sort_order */}
          {displayedMenus.length === 0 ? (
            <div className="p-12 text-center bg-[#faf5ed] rounded-2xl border border-dashed border-[#e3d7c3] my-auto">
              <p className="text-stone-500 text-sm mb-2">ยังไม่มีรายการเมนูในหมวดหมู่นี้</p>
              <Link href="/admin/menu" className="text-xs bg-[#c27847] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#b06737] inline-block">
                👉 ไปเพิ่มเมนูที่หน้าจัดการเมนู
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {displayedMenus.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="relative bg-white rounded-2xl shadow-sm hover:shadow-md border border-[#ede3d5] active:scale-95 transition flex flex-col overflow-hidden text-left group"
                >
                  <div className="w-full h-28 bg-[#faf5ed] relative overflow-hidden flex items-center justify-center">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-3xl"
                        style={{ backgroundColor: item.color_code || '#c27847' }}
                      >
                        <span className="opacity-90 drop-shadow">{getCategoryIcon(item.category)}</span>
                      </div>
                    )}
                    <span className="absolute bottom-2 right-2 bg-black/75 text-white font-black text-sm px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                      {item.price} ฿
                    </span>
                  </div>

                  <div className="p-2.5 w-full bg-white flex items-center justify-between border-t border-stone-100">
                    <span className="font-bold text-xs text-stone-800 truncate pr-1">{item.name}</span>
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10"
                      style={{ backgroundColor: item.color_code || '#c27847' }}
                    ></span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* คอลัมน์กลาง (3 ส่วน): ตะกร้าคิดเงิน */}
        <div className="lg:col-span-3 bg-[#fffdfa] p-4 rounded-2xl shadow-sm border border-[#ede3d5] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-[#ede3d5] pb-3 mb-3 bg-[#fdf9f3] -mx-4 -mt-4 p-4 rounded-t-2xl">
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block">คิวถัดไป</span>
                <span className="text-3xl font-black text-[#c27847]">Q{String(nextQueue).padStart(2, '0')}</span>
              </div>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 font-semibold underline">
                  ล้างบิล
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-14 text-stone-400">
                  <span className="text-3xl block mb-2 opacity-50">🛒</span>
                  <p className="text-xs">ยังไม่ได้เลือกรายการอาหาร</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-[#faf6ef] p-2.5 rounded-xl border border-[#ede3d5]">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color_code }}></span>
                      <div className="truncate">
                        <p className="font-bold text-stone-800 text-xs leading-tight truncate">{item.name}</p>
                        <p className="text-[11px] text-stone-500">{item.price} ฿</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => decreaseQty(item.id)}
                        className="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 font-bold text-stone-700 text-sm flex items-center justify-center transition"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm w-6 text-center text-stone-800">{item.qty}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="w-7 h-7 rounded-lg bg-[#c27847] text-white hover:bg-[#b06737] font-bold text-sm flex items-center justify-center transition"
                      >
                        +
                      </button>
                      <span className="font-bold text-xs text-stone-800 w-12 text-right">
                        {(item.price * item.qty).toLocaleString()} ฿
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-[#ede3d5] pt-3 mt-3">
            <div className="flex justify-between text-xs text-stone-600 mb-1">
              <span>รวมจำนวนรายการ</span>
              <span className="font-bold text-stone-800">{totalItems} รายการ</span>
            </div>
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-sm font-bold text-stone-700">ยอดรวมสุทธิ</span>
              <span className="text-3xl font-black text-[#2e7d32]">{totalPrice.toLocaleString()} ฿</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
              className="w-full bg-[#2e7d32] hover:bg-[#256628] disabled:bg-stone-300 text-white font-bold text-lg py-3 rounded-xl shadow-md transition active:scale-98"
            >
              {loading ? 'กำลังบันทึก...' : `ยืนยัน & ออกคิว Q${String(nextQueue).padStart(2, '0')}`}
            </button>
          </div>
        </div>

        {/* คอลัมน์ขวา (2 ส่วน): คิวกำลังทำ */}
        <div className="lg:col-span-2 bg-[#fffdfa] p-3 rounded-2xl shadow-sm border border-[#ede3d5] flex flex-col">
          <div className="border-b border-[#ede3d5] pb-2 mb-2 flex justify-between items-center">
            <h2 className="text-xs font-bold text-stone-700 flex items-center gap-1">
              <span>🔥</span> คิวกำลังทำ
            </h2>
            <span className="text-[11px] font-bold bg-[#faf3e8] text-[#c27847] px-2 py-0.5 rounded-full border border-[#e8dccb]">
              {activeOrders.length}
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[580px] pr-1">
            {activeOrders.length === 0 ? (
              <p className="text-center text-stone-400 py-10 text-xs">ไม่มีคิวค้าง</p>
            ) : (
              activeOrders.map((order) => (
                <div
                  key={order.id}
                  className={`p-2.5 rounded-xl border transition ${
                    order.status === 'ready'
                      ? 'border-green-400 bg-[#f2faf3]'
                      : 'border-[#ebd9c1] bg-[#fdfaf5]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-lg font-black text-stone-900">
                      Q{String(order.queue_number).padStart(2, '0')}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        order.status === 'ready'
                          ? 'bg-green-600 text-white'
                          : 'bg-[#c27847] text-white'
                      }`}
                    >
                      {order.status === 'ready' ? 'เสร็จ' : 'กำลังทำ'}
                    </span>
                  </div>

                  <div className="text-[11px] text-stone-600 space-y-0.5 mb-2 max-h-24 overflow-y-auto">
                    {Array.isArray(order.items) &&
                      order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate pr-1">• {item.name}</span>
                          <span className="font-bold flex-shrink-0">x{item.qty}</span>
                        </div>
                      ))}
                  </div>

                  <div className="border-t border-stone-200/60 pt-1.5 flex justify-between items-center">
                    <span className="font-black text-xs text-stone-800">{order.total_price}฿</span>
                    <div className="flex gap-1">
                      {order.status === 'cooking' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xs"
                        >
                          พร้อมเสิร์ฟ
                        </button>
                      )}
                      <button
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="bg-stone-700 hover:bg-stone-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xs"
                      >
                        จบ
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
