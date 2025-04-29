'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Search } from 'lucide-react'
import ItemCard from './_components/ItemCard'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        fetchItems()
      } else {
        router.replace('/sign-in')
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const reportsRef = collection(db, 'reports')
      const q = query(reportsRef)
      
      const querySnapshot = await getDocs(q)
      const itemsData = []

      querySnapshot.forEach((doc) => {
        const reportData = doc.data()
        const date = reportData.date || (reportData.createdAt?.toDate()?.toISOString().split('T')[0] || '')
        
        itemsData.push({
          id: doc.id,
          name: reportData.itemName,
          location: reportData.location,
          date: date,
          category: reportData.category,
          description: reportData.description,
          status: reportData.status,
          type: reportData.type,
          imageUrl: reportData.imageBase64 
            ? `data:image/jpeg;base64,${reportData.imageBase64}`
            : null
        })
      })

      setItems(itemsData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching items:', error)
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'lost' && item.type === 'lost') || 
                      (activeTab === 'found' && item.type === 'found')
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory
    return matchesTab && matchesSearch && matchesCategory
  })

  const categories = [
    'All',
    'Bag',
    'Electronics',
    'Book',
    'Clothing',
    'Personal Items',
    'Keys',
    'ID Card',
    'Other'
  ]

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2ecc71] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-[#2c3e50]">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-[#2c3e50] shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">NWSSU: Lost and Found</h1>
            <p className="text-gray-300 text-lg mt-2">
              Reuniting lost items with their owners
            </p>
          </div>
          <div className="w-24 h-24 bg-white rounded-full p-2 shadow-md">
            <Image 
              src="/header.png" 
              alt="NWSSU Lost and Found" 
              width={96} 
              height={96}
              className="rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-8 py-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-red-500">
          <h3 className="text-gray-500 text-sm font-medium">Lost Items Today</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">12</p>
        </div>
        <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-medium">Found Items Today</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">8</p>
        </div>
        <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-medium">Resolved Cases</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">5</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 pb-12">
        {/* Controls Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-[#2c3e50]">Recent Items</h2>
            <div className="flex gap-2">
              <button 
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'all' ? 'bg-[#2c3e50] text-white' : 'bg-gray-100 text-[#2c3e50] hover:bg-gray-200'
                }`}
                onClick={() => setActiveTab('all')}
              >
                All
              </button>
              <button 
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'lost' ? 'bg-red-500 text-white' : 'bg-gray-100 text-[#2c3e50] hover:bg-gray-200'
                }`}
                onClick={() => setActiveTab('lost')}
              >
                Lost
              </button>
              <button 
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'found' ? 'bg-green-500 text-white' : 'bg-gray-100 text-[#2c3e50] hover:bg-gray-200'
                }`}
                onClick={() => setActiveTab('found')}
              >
                Found
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search items by name, location or description..." 
              className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-2">
            {categories.map(category => (
              <button 
                key={category}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category 
                    ? 'bg-[#2ecc71] text-white' 
                    : 'bg-gray-100 text-[#2c3e50] hover:bg-gray-200'
                }`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Item Cards Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <ItemCard 
                key={item.id}
                status={item.type}
                itemName={item.name}
                location={item.location}
                date={item.date}
                category={item.category}
                description={item.description}
                imageUrl={item.imageUrl}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="mx-auto max-w-md">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-[#2c3e50]">
                {searchTerm || activeCategory !== 'All' || activeTab !== 'all'
                  ? 'No items match your search' 
                  : 'No items available yet'}
              </h3>
              <p className="mt-1 text-gray-500">
                {searchTerm ? 'Try different search terms' : 'Check back later or report a new item'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard