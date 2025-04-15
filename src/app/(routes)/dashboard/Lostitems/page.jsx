'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { Search } from 'lucide-react'
import ItemCard from '../_components/ItemCard'

const LostFoundPage = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        fetchLostItems(firebaseUser.email) // Pass user's email
      } else {
        router.replace('/sign-in')
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchLostItems = async (userEmail) => {
    try {
      setLoading(true)
      const reportsRef = collection(db, 'reports')
      
      // First get all lost items
      const q = query(
        reportsRef,
        where('type', '==', 'lost')
      )
      
      const querySnapshot = await getDocs(q)
      const itemsData = []

      querySnapshot.forEach((doc) => {
        const reportData = doc.data()
        // Skip items belonging to the current user
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Lost Items</h2>
        </div>

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
            {searchTerm || activeCategory !== 'All' 
              ? 'No matching items found' 
              : 'No lost items available'}
          </div>
        )}
      </div>
    </div>
  )
}

export default LostFoundPage