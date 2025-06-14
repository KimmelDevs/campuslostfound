'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Search, Bell, MessageSquare } from 'lucide-react'
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
  const [stats, setStats] = useState({
    lost: 0,
    found: 0,
    resolved: 0
  })
  const [networkStatus, setNetworkStatus] = useState('good') // 'good', 'slow', 'offline'

  useEffect(() => {
    // Check network status
    const updateNetworkStatus = () => {
      if (!navigator.onLine) {
        setNetworkStatus('offline')
      } else {
        const latency = Math.random() * 1000
        setNetworkStatus(latency < 200 ? 'good' : latency < 500 ? 'slow' : 'offline')
      }
    }

    updateNetworkStatus()
    const interval = setInterval(updateNetworkStatus, 5000)

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        fetchItems(firebaseUser.uid)
      } else {
        router.replace('/sign-in')
      }
    })

    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [router])

  const fetchItems = async (userId) => {
    try {
      setLoading(true)
      const reportsRef = collection(db, 'reports')
      const q = query(reportsRef, where('userId', '!=', userId)) // Exclude user's own posts
      
      const querySnapshot = await getDocs(q)
      const itemsData = []
      let lostCount = 0
      let foundCount = 0
      let resolvedCount = 0

      // Get date 7 days ago
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      querySnapshot.forEach((doc) => {
        const reportData = doc.data()
        const createdAt = reportData.createdAt?.toDate() || new Date()
        const isThisWeek = createdAt >= oneWeekAgo
        
        // Count weekly stats
        if (isThisWeek) {
          if (reportData.type === 'lost') lostCount++
          if (reportData.type === 'found') foundCount++
          if (reportData.status === 'resolved') resolvedCount++
        }

        const date = reportData.date || (createdAt.toISOString().split('T')[0] || '')
        
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
      setStats({
        lost: lostCount,
        found: foundCount,
        resolved: resolvedCount
      })
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
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">NWSSU: Lost and Found</h1>
              <p className="text-gray-300 text-lg mt-2">
                Reuniting lost items with their owners
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Notification, Message and WiFi Icons */}
              <div className="flex items-center gap-4">
                {/* Bell Icon */}
                <button 
                  onClick={() => router.push('/dashboard/notification')} 
                  className="relative group text-white hover:text-blue-400 transition-colors"
                >
                  <Bell className="w-6 h-6" />
                </button>

                {/* Message Icon */}
                <button 
                  onClick={() => router.push('/dashboard/messages')} 
                  className="relative group text-white hover:text-blue-400 transition-colors"
                >
                  <MessageSquare className="w-6 h-6" />
                </button>

                {/* WiFi Icon */}
                <div className="relative">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`${
                      networkStatus === 'good'
                        ? 'text-green-500'
                        : networkStatus === 'slow'
                        ? 'text-yellow-500'
                        : 'text-red-500'
                    }`}
                  >
                    <path d="M5 12.55a11 11 0 0 1 14.08 0" opacity={networkStatus === 'offline' ? '0' : '1'} />
                    <path d="M1.42 9a16 16 0 0 1 21.16 0" opacity={networkStatus === 'good' ? '1' : '0'} />
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" opacity={networkStatus !== 'offline' ? '1' : '0'} />
                    <circle cx="12" cy="19" r="1" opacity={networkStatus !== 'offline' ? '1' : '0'} />
                  </svg>

                  {/* Tooltip */}
                  <div className="absolute right-0 top-full mt-1 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 hover:opacity-100 transition-opacity">
                    {networkStatus === 'good'
                      ? 'Strong connection'
                      : networkStatus === 'slow'
                      ? 'Weak connection'
                      : 'No internet connection'}
                  </div>
                </div>
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
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-8 py-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-red-500">
          <h3 className="text-gray-500 text-sm font-medium">Lost Items This Week</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.lost}</p>
        </div>
        <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-medium">Found Items This Week</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.found}</p>
        </div>
        <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-medium">Resolved This Week</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.resolved}</p>
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
                id={item.id}  
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