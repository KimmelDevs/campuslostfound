'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import ItemCard from '../_components/OwnItemCard '

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

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
      setLoading(true)
      const userReportsRef = collection(db, 'reports')
      const q = query(userReportsRef, where('userId', '==', userId))
      const querySnapshot = await getDocs(q)

      const reports = {
        lost: [],
        found: [],
        resolved: []
      }

      querySnapshot.forEach((doc) => {
        const reportData = doc.data()
        const date = reportData.date || (reportData.createdAt?.toDate()?.toISOString().split('T')[0] || '')
        
        const item = {
          id: doc.id, // This is the crucial ID that gets passed to ItemCard
          userId: userId,
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
    } finally {
      setLoading(false)
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
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2ecc71] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-[#2c3e50]">Loading profile...</p>
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
            <h1 className="text-3xl font-bold text-white">My Profile</h1>
            <p className="text-gray-300 text-lg mt-2">
              View and manage your lost and found items
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-white">{user?.displayName || user?.email?.split('@')[0] || 'User'}</p>
              <p className="text-gray-300 text-sm">{user?.email}</p>
            </div>
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="px-4 py-2 text-sm text-white bg-[#e74c3c] hover:bg-[#c0392b] rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Confirm Sign Out</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to sign out?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm text-white bg-[#e74c3c] hover:bg-[#c0392b] rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex border-b mb-8">
          <button
            onClick={() => setActiveTab('lost')}
            className={`px-6 py-3 font-medium ${activeTab === 'lost' ? 'text-[#2ecc71] border-b-2 border-[#2ecc71]' : 'text-gray-500 hover:text-[#2c3e50]'}`}
          >
            My Lost Items ({items.lost.length})
          </button>
          <button
            onClick={() => setActiveTab('found')}
            className={`px-6 py-3 font-medium ${activeTab === 'found' ? 'text-[#2ecc71] border-b-2 border-[#2ecc71]' : 'text-gray-500 hover:text-[#2c3e50]'}`}
          >
            My Found Items ({items.found.length})
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-6 py-3 font-medium ${activeTab === 'resolved' ? 'text-[#2ecc71] border-b-2 border-[#2ecc71]' : 'text-gray-500 hover:text-[#2c3e50]'}`}
          >
            Resolved Items ({items.resolved.length})
          </button>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'lost' && items.lost.map(item => (
            <ItemCard 
              key={item.id}
              id={item.id}  // Passing the ID to ItemCard
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
              id={item.id}  // Passing the ID to ItemCard
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
              id={item.id}  // Passing the ID to ItemCard
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
          <div className="bg-white rounded-xl shadow-lg p-12 text-center mt-6">
            <div className="mx-auto max-w-md">
              <h3 className="text-lg font-medium text-[#2c3e50]">
                No {activeTab} items to display
              </h3>
              <p className="mt-1 text-gray-500">
                {activeTab === 'lost' ? 'You haven\'t reported any lost items yet' : 
                 activeTab === 'found' ? 'You haven\'t reported any found items yet' : 
                 'You don\'t have any resolved cases yet'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}