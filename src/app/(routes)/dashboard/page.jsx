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
    // Filter by tab
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'lost' && item.type === 'lost') || 
                      (activeTab === 'found' && item.type === 'found')
    
    // Filter by search term
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filter by category
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">NWSSU: Lost and Found</h1>
            <p className="text-gray-600 text-lg mt-2">
              A place to find a missing item and a place to find the owner of an item
            </p>
          </div>
          <div>
            <Image 
              src="/header.png" 
              alt="NWSSU Lost and Found" 
              width={100} 
              height={100}
              className="rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats Section (unchanged) */}
      <div className="max-w-6xl mx-auto px-8 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-gray-500 text-sm">Lost Items Today</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">12</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-gray-500 text-sm">Found Items Today</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">8</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-gray-500 text-sm">Resolved Cases Today</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">5</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Recent Items</h2>
          <div className="flex gap-2">
            <button 
              className={`px-4 py-2 rounded ${activeTab === 'all' ? 'bg-black text-white' : 'border'}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button 
              className={`px-4 py-2 rounded ${activeTab === 'lost' ? 'bg-black text-white' : 'border'}`}
              onClick={() => setActiveTab('lost')}
            >
              Lost
            </button>
            <button 
              className={`px-4 py-2 rounded ${activeTab === 'found' ? 'bg-black text-white' : 'border'}`}
              onClick={() => setActiveTab('found')}
            >
              Found
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search items..." 
            className="w-full pl-10 pr-4 py-2 border rounded"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(category => (
            <button 
              key={category}
              className={`px-3 py-1 rounded-full text-sm ${
                activeCategory === category 
                  ? 'bg-black text-white' 
                  : 'border'
              }`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Item Cards Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
          <div className="text-center py-12 text-gray-500">
            {searchTerm || activeCategory !== 'All' || activeTab !== 'all'
              ? 'No matching items found' 
              : 'No items available'}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard