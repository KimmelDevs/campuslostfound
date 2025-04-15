'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import ItemCard from '../_components/ItemCard'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('lost')
  const [items, setItems] = useState({
    lost: [],
    found: [],
    resolved: []
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        await fetchUserReports(firebaseUser.uid)
        setLoading(false)
      } else {
        router.replace('/sign-in')
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchUserReports = async (userId) => {
    try {
      // Query the user's reports subcollection
      const userReportsRef = collection(db, 'users', userId, 'reports')
      const q = query(userReportsRef)
      const querySnapshot = await getDocs(q)

      const reports = {
        lost: [],
        found: [],
        resolved: []
      }

      querySnapshot.forEach((doc) => {
        const reportData = doc.data()
        // Convert Firestore timestamp to date string if it exists
        const date = reportData.date || (reportData.createdAt?.toDate()?.toISOString().split('T')[0] || '')
        
        const item = {
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
        }

        // Categorize based on type and status
        if (reportData.status === 'resolved') {
          reports.resolved.push(item)
        } else if (reportData.type === 'lost') {
          reports.lost.push(item)
        } else if (reportData.type === 'found') {
          reports.found.push(item)
        }
      })

      setItems(reports)
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push('/sign-in')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Loading profile...</p>
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
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-gray-600 text-lg mt-2">
              View and manage your lost and found items
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{user?.displayName || user?.email?.split('@')[0] || 'User'}</p>
              <p className="text-gray-600 text-sm">{user?.email}</p>
            </div>
            <button 
              onClick={handleSignOut}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4">
        {/* Navigation Tabs */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => setActiveTab('lost')}
            className={`px-4 py-2 font-medium ${activeTab === 'lost' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            My Lost Items ({items.lost.length})
          </button>
          <button
            onClick={() => setActiveTab('found')}
            className={`px-4 py-2 font-medium ${activeTab === 'found' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            My Found Items ({items.found.length})
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-2 font-medium ${activeTab === 'resolved' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            Resolved Items ({items.resolved.length})
          </button>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {activeTab === 'lost' && items.lost.map(item => (
            <ItemCard 
              key={item.id}
              status="lost"
              itemName={item.name}
              location={item.location}
              date={item.date}
              category={item.category}
              description={item.description}
              imageUrl={item.imageUrl}
            />
          ))}
          {activeTab === 'found' && items.found.map(item => (
            <ItemCard 
              key={item.id}
              status="found"
              itemName={item.name}
              location={item.location}
              date={item.date}
              category={item.category}
              description={item.description}
              imageUrl={item.imageUrl}
            />
          ))}
          {activeTab === 'resolved' && items.resolved.map(item => (
            <ItemCard 
              key={item.id}
              status="resolved"
              itemName={item.name}
              location={item.location}
              date={item.date}
              category={item.category}
              description={item.description}
              imageUrl={item.imageUrl}
            />
          ))}
        </div>

        {/* Empty State */}
        {((activeTab === 'lost' && items.lost.length === 0) ||
          (activeTab === 'found' && items.found.length === 0) ||
          (activeTab === 'resolved' && items.resolved.length === 0)) && (
          <div className="text-center py-12 text-gray-500">
            No {activeTab} items to display
          </div>
        )}
      </div>
    </div>
  )
}