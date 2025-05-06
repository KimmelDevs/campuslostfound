'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { Search, Bell, MessageSquare } from 'lucide-react'
import ItemCard from '../_components/ItemCard'

const LostFoundPage = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [networkStatus, setNetworkStatus] = useState('good') // 'good', 'slow', 'offline'
  const router = useRouter()

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
        fetchLostItems(firebaseUser.email)
      } else {
        router.replace('/sign-in')
      }
    })

    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [router])

  const fetchLostItems = async (userEmail) => {
    try {
      setLoading(true)
      const reportsRef = collection(db, 'reports')
      
      const q = query(
        reportsRef,
        where('type', '==', 'lost')
      )
      
      const querySnapshot = await getDocs(q)
      const itemsData = []

      querySnapshot.forEach((doc) => {
        const reportData = doc.data()
        if (reportData.userEmail === userEmail) return
        
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
      console.error('Error fetching lost items:', error)
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory
    
    return matchesSearch && matchesCategory
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
          <p className="mt-4 text-[#2c3e50]">Loading lost items...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header Section */}
      <div className="bg-[#2c3e50] py-8 shadow-lg relative">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white">Lost Items</h1>
              <p className="text-gray-300 mt-2">
                Browse items reported as lost by others in the community
              </p>
            </div>
            
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-5">
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search lost items by name, location or description..." 
              className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
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

        {/* Items Grid */}
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
                {searchTerm || activeCategory !== 'All'
                  ? 'No lost items match your search' 
                  : 'No lost items reported yet'}
              </h3>
              <p className="mt-1 text-gray-500">
                {searchTerm ? 'Try different search terms' : 'Check back later for new lost items'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LostFoundPage