'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

const CATEGORIES = [
  { id: 'skewer', label: '🍢 ชาบูไม้เสียบ', badge: 'bg-orange-100 text-orange-800' },
  { id: 'vegetable', label: '🥬 เมนูผัก', badge: 'bg-green-100 text-green-800' },
  { id: 'noodle', label: '🍜 เมนูเส้น', badge: 'bg-amber-100 text-amber-800' },
  { id: 'soup', label: '🍲 น้ำซุป', badge: 'bg-stone-200 text-stone-800' },
]

export default function AdminMenuPage() {
  const [menus, setMenus] = useState([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('skewer')
  const [colorCode, setColorCode] = useState('#c27847')
  const [sortOrder, setSortOrder] = useState('0')
  const [imageFile, setImageFile] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [filterCat, setFilterCat] = useState('all')

  const fetchMenus = async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('price', { ascending: true })
    if (data) setMenus(data)
  }

  useEffect(() => {
    fetchMenus()
  }, [])

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `menus/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !price) return alert('กรุณากรอกชื่อและราคาให้ครบครับ')
    setUploading(true)

    try {
      let imageUrl = null
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      const menuData = {
        name,
        price: parseInt(price, 10),
        category,
        color_code: colorCode,
        sort_order: parseInt(sortOrder, 10) || 0,
      }

      if (imageUrl) {
        menuData.image_url = imageUrl
      }

      if (editingId) {
        const { error } = await supabase.from('menu_items').update(menuData).eq('id', editingId)
        if (error) throw error
        setEditingId(null)
      } else {
        const { error } = await supabase.from('menu_items').insert([menuData])
        if (error) throw error
      }

      setName('')
      setPrice('')
      setSortOrder('0')
      setImageFile(null)
      const fileInput = document.getElementById('menu-image-input')
      if (fileInput) fileInput.value = ''

      fetchMenus()
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (menu) => {
    setEditingId(menu.id)
    setName(menu.name)
    setPrice(menu.price)
    setCategory(menu.category || 'skewer')
    setColorCode(menu.color_code || '#c27847')
    setSortOrder(String(menu.sort_order ?? 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (confirm('ต้องการลบเมนูนี้ใช่หรือไม่?')) {
      await supabase.from('menu_items').delete().eq('id', id)
      fetchMenus()
    }
  }

  // ฟังก์ชันสลับลำดับ ขึ้น/ลง
  const handleMoveOrder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= filteredMenus.length) return

    const currentItem = filteredMenus[index]
    const targetItem = filteredMenus[targetIndex]

    const currentOrder = currentItem.sort_order ?? index
    const targetOrder = targetItem.sort_order ?? targetIndex

    // ถ้าค่าเท่ากัน ให้สลับแบบขยับตัวเลข
    const newCurrentOrder = currentOrder === targetOrder ? (direction === 'up' ? targetOrder - 1 : targetOrder + 1) : targetOrder
    const newTargetOrder = currentOrder

    await supabase.from('menu_items').update({ sort_order: newCurrentOrder }).eq('id', currentItem.id)
    await supabase.from('menu_items').update({ sort_order: newTargetOrder }).eq('id', targetItem.id)
    fetchMenus()
  }

  const getCategoryInfo = (catId) => {
    return CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0]
  }

  const filteredMenus = filterCat === 'all' ? menus : menus.filter((m) => m.category === filterCat)

  return (
    <div className="min-h-screen bg-[#fcf8f2] font-sans text-stone-800">
      <header className="bg-[#4a3b32] text-[#fdfbf7] px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <div>
            <h1 className="text-lg font-bold">จัดการเมนูร้านชาบูเสียบไม้</h1>
            <p className="text-xs text-stone-300">จัดเรียงลำดับ แยกหมวดหมู่ และใส่รูปภาพ</p>
          </div>
        </div>
        <nav className="flex gap-2 text-xs font-semibold">
          <Link href="/pos" className="bg-[#5c4a3e] hover:bg-[#6e594b] px-4 py-2 rounded-lg text-stone-200 transition">
            หน้าคิดเงิน (POS)
          </Link>
          <Link href="/admin/menu" className="bg-[#c27847] px-4 py-2 rounded-lg text-white shadow-sm">
            จัดการเมนู
          </Link>
          <Link href="/history" className="bg-[#5c4a3e] hover:bg-[#6e594b] px-4 py-2 rounded-lg text-stone-200 transition">
            สรุปยอดขาย
          </Link>
        </nav>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-[#fffdfa] p-6 rounded-2xl shadow-sm border border-[#ede3d5] mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <h2 className="text-lg font-bold col-span-1 md:col-span-3 text-[#5c4a3e]">
            {editingId ? '✏️ แก้ไขรายการเมนู' : '➕ เพิ่มรายการเมนูใหม่'}
          </h2>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1 text-stone-700">ชื่อรายการ</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น หมูสามชั้นสไลด์, ผักบุ้ง, มาม่า"
              className="w-full border border-stone-300 p-2.5 rounded-xl text-sm bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-stone-700">ราคา (บาท)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="เช่น 10"
              className="w-full border border-stone-300 p-2.5 rounded-xl text-sm bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-stone-700">หมวดหมู่</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-stone-300 p-2.5 rounded-xl text-sm bg-white font-semibold text-stone-700"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-stone-700">🔢 ลำดับการแสดง (เลขน้อยอยู่ก่อน)</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="เช่น 1, 2, 3"
              className="w-full border border-stone-300 p-2.5 rounded-xl text-sm bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-stone-700">สีขอบปุ่ม / แถบสีไม้</label>
            <input
              type="color"
              value={colorCode}
              onChange={(e) => setColorCode(e.target.value)}
              className="w-full h-10 p-1 border border-stone-300 rounded-xl cursor-pointer bg-white"
            />
          </div>

          <div className="col-span-1 md:col-span-3">
            <label className="block text-xs font-bold mb-1 text-stone-700">🖼️ รูปภาพอาหาร (ไม่ใส่ก็ได้)</label>
            <input
              id="menu-image-input"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="w-full border border-stone-300 p-2 rounded-xl text-sm bg-white"
            />
          </div>

          <div className="col-span-1 md:col-span-3 flex gap-2 pt-2">
            <button
              type="submit"
              disabled={uploading}
              className="bg-[#2e7d32] hover:bg-[#256628] disabled:bg-stone-300 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
            >
              {uploading ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'บันทึกเมนูใหม่'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setName('')
                  setPrice('')
                  setSortOrder('0')
                  setImageFile(null)
                }}
                className="bg-stone-400 hover:bg-stone-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>

        {/* แถบกรองหมวดหมู่ */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilterCat('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filterCat === 'all' ? 'bg-[#4a3b32] text-white' : 'bg-[#ede3d5] text-stone-700 hover:bg-[#e2d5c3]'
            }`}
          >
            ทั้งหมด ({menus.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCat(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                filterCat === cat.id ? 'bg-[#c27847] text-white' : 'bg-[#fffdfa] border border-[#ede3d5] text-stone-700 hover:bg-[#faf3e8]'
              }`}
            >
              {cat.label} ({menus.filter((m) => m.category === cat.id).length})
            </button>
          ))}
        </div>

        {/* ตารางแสดงรายการพร้อมปุ่มสลับลำดับ */}
        <div className="bg-[#fffdfa] rounded-2xl shadow-sm border border-[#ede3d5] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f5ece1] border-b border-[#ede3d5] text-xs text-stone-700">
                <th className="p-3.5 w-16 text-center">ลำดับ</th>
                <th className="p-3.5">รูปภาพ</th>
                <th className="p-3.5">ชื่อรายการ</th>
                <th className="p-3.5">หมวดหมู่</th>
                <th className="p-3.5">ราคา</th>
                <th className="p-3.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredMenus.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-stone-400 text-sm">
                    ยังไม่มีรายการเมนูในหมวดนี้
                  </td>
                </tr>
              ) : (
                filteredMenus.map((menu, idx) => {
                  const catInfo = getCategoryInfo(menu.category)
                  return (
                    <tr key={menu.id} className="border-b border-[#f0e6d8] hover:bg-[#faf6ef] text-sm">
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-bold text-xs text-stone-500 w-5">{menu.sort_order ?? 0}</span>
                          <div className="flex flex-col">
                            <button
                              onClick={() => handleMoveOrder(idx, 'up')}
                              disabled={idx === 0}
                              className="text-[10px] text-stone-400 hover:text-stone-800 disabled:opacity-20 leading-none py-0.5"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => handleMoveOrder(idx, 'down')}
                              disabled={idx === filteredMenus.length - 1}
                              className="text-[10px] text-stone-400 hover:text-stone-800 disabled:opacity-20 leading-none py-0.5"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        {menu.image_url ? (
                          <img src={menu.image_url} alt={menu.name} className="w-12 h-12 object-cover rounded-xl border border-stone-200" />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-inner"
                            style={{ backgroundColor: menu.color_code || '#c27847' }}
                          >
                            ไม่มีรูป
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-stone-800">{menu.name}</td>
                      <td className="p-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${catInfo.badge}`}>
                          {catInfo.label}
                        </span>
                      </td>
                      <td className="p-3.5 font-black text-[#c27847]">{menu.price} ฿</td>
                      <td className="p-3.5 text-right space-x-3">
                        <button onClick={() => handleEdit(menu)} className="text-amber-700 hover:underline font-semibold text-xs">
                          แก้ไข
                        </button>
                        <button onClick={() => handleDelete(menu.id)} className="text-red-600 hover:underline font-semibold text-xs">
                          ลบ
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
