'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { Search, Check, Clock, Ban } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function MessagesPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chats, setChats] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        fetchChats(firebaseUser.uid)
      } else {
        router.replace('/sign-in')
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchChats = async (userId) => {
    try {
      setLoading(true)
      setError(null)
      const chatsRef = collection(db, 'chats')
      
      // Query chats where current user is a participant AND admin has joined
      const q = query(
        chatsRef,
        where('participants', 'array-contains', userId),
        where('adminJoined', '==', true),
        orderBy('lastUpdated', 'desc')
      )
      
      const querySnapshot = await getDocs(q)
      const chatsData = []
  
      for (const docSnap of querySnapshot.docs) {
        const chatData = docSnap.data()
        
        // Get the other participant's details
        const otherUserId = chatData.participants.find(id => id !== userId)
        if (otherUserId) {
          const userDoc = await getDoc(doc(db, 'users', otherUserId))
          const userData = userDoc.data()
          
          // Get item status from reports collection
          let itemStatus = 'pending'
          if (chatData.itemId) {
            const itemDoc = await getDoc(doc(db, 'reports', chatData.itemId))
            if (itemDoc.exists()) {
              itemStatus = itemDoc.data().status || 'pending'
            }
          }
          
          chatsData.push({
            id: docSnap.id,
            lastMessage: chatData.lastMessage,
            lastUpdated: chatData.lastUpdated?.toDate(),
            otherUser: {
              id: otherUserId,
              name: userData?.displayName || 'Unknown User',
              email: userData?.email || '',
              photoURL: userData?.photoURL || '/default-avatar.png'
            },
            unreadCount: chatData.unreadCount?.[userId] || 0,
            itemName: chatData.itemName,
            itemType: chatData.itemType,
            status: itemStatus,
            adminJoined: chatData.adminJoined || false
          })
        }
      }
  
      setChats(chatsData)
    } catch (error) {
      console.error('Error fetching chats:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.otherUser.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         chat.otherUser.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = activeFilter === 'all' || 
                         (activeFilter === 'unread' && chat.unreadCount > 0)
    
    return matchesSearch && matchesFilter
  })

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <Check className="text-green-500" size={16} />
      case 'rejected':
        return <Ban className="text-red-500" size={16} />
      default:
        return <Clock className="text-yellow-500" size={16} />
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
            <Check size={14} />
            <span>Verified</span>
          </div>
        )
      case 'rejected':
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs">
            <Ban size={14} />
            <span>Rejected</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs">
            <Clock size={14} />
            <span>Pending</span>
          </div>
        )
    }
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2ecc71] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-[#2c3e50]">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-red-500 mb-4">Error Loading Chats</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <p className="text-gray-600 mb-6">
            This error typically occurs when the database needs an index. Firebase should have provided
            a link to create one automatically.
          </p>
          <Link 
            href="/admindashboard" 
            className="px-4 py-2 bg-[#2ecc71] text-white rounded-lg hover:bg-[#27ae60] transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header Section */}
      <div className="bg-[#2c3e50] py-8 shadow-lg">
        <div className="max-w-7xl mx-auto px-8">
          <h1 className="text-3xl font-bold text-white">Admin Chats</h1>
          <p className="text-gray-300 mt-2">
            Chats where admin has joined for verification
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search admin chats by name, email or content..." 
              className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button 
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === 'all' 
                  ? 'bg-[#2ecc71] text-white' 
                  : 'bg-gray-100 text-[#2c3e50] hover:bg-gray-200'
              }`}
              onClick={() => setActiveFilter('all')}
            >
              All Admin Chats
            </button>
            <button 
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === 'unread' 
                  ? 'bg-[#2ecc71] text-white' 
                  : 'bg-gray-100 text-[#2c3e50] hover:bg-gray-200'
              }`}
              onClick={() => setActiveFilter('unread')}
            >
              Unread Messages
            </button>
          </div>
        </div>

        {/* Chats List */}
        {filteredChats.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {filteredChats.map(chat => (
              <div 
                key={chat.id}
                className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => router.push(`/admindashboard/messages/chat?id=${chat.id}`)}
              >
                <div className="p-4 flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Image
                      src={chat.otherUser.photoURL}
                      alt={chat.otherUser.name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium text-[#2c3e50] truncate">
                          {chat.otherUser.name}
                        </h3>
                        {getStatusBadge(chat.status)}
                      </div>
                      <span className="text-sm text-gray-500">
                        {chat.lastUpdated?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="mt-1">
                      <p className="text-gray-600 truncate">
                        {chat.lastMessage}
                      </p>
                    </div>
                    <div className="mt-1">
                      <p className="text-xs text-gray-500">
                        {chat.itemType === 'lost' ? 'Lost' : 'Found'}: {chat.itemName}
                      </p>
                    </div>
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#2ecc71] text-white text-sm font-medium">
                        {chat.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="mx-auto max-w-md">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-[#2c3e50]">
                {searchTerm || activeFilter !== 'all'
                  ? 'No admin chats match your search' 
                  : 'No admin chats yet'}
              </h3>
              <p className="mt-1 text-gray-500">
                {searchTerm ? 'Try different search terms' : 'Admin has not joined any chats yet'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}