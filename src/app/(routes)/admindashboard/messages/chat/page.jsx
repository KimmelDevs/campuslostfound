'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot, updateDoc, query, orderBy } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { ArrowLeft, Image as ImageIcon, Send, X, AlertTriangle, Check, Clock, Ban } from 'lucide-react'
import Image from 'next/image'

const AdminChatPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const chatId = searchParams.get('id')
  const [chat, setChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [otherUser, setOtherUser] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [imageBase64, setImageBase64] = useState('')
  const messagesEndRef = useRef(null)
  const unsubscribeRef = useRef(null)
  const [status, setStatus] = useState('pending')
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminJoined, setAdminJoined] = useState(false)
  const [previousPath, setPreviousPath] = useState('/admindashboard/messages')

  // Get previous path from session storage on component mount
  useEffect(() => {
    const storedPath = sessionStorage.getItem('previousPath')
    if (storedPath) {
      setPreviousPath(storedPath)
    }
  }, [])

  // Store current path before navigating to chat
  useEffect(() => {
    if (pathname && chatId) {
      sessionStorage.setItem('previousPath', pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''))
    }
  }, [pathname, searchParams, chatId])

  // Quick action messages
  const quickActions = [
    { text: 'Request proof of ownership', message: 'Please provide additional proof of ownership for this item.' },
    { text: 'Schedule a pickup', message: 'Let\'s schedule a time for you to pick up the item.' },
    { text: 'Ask for identification', message: 'Please provide a valid ID for verification purposes.' },
    { text: 'Claim approved', message: 'Your claim has been approved. Please arrange for pickup.', status: 'verified' },
    { text: 'Claim rejected', message: 'Your claim has been rejected due to insufficient evidence.', status: 'rejected' }
  ]

  useEffect(() => {
    if (!chatId) {
      setError('No chat ID provided')
      setLoading(false)
      return
    }

    const fetchChatData = async () => {
      try {
        setLoading(true)
        
        const chatRef = doc(db, 'chats', chatId)
        const chatSnap = await getDoc(chatRef)
        
        if (!chatSnap.exists()) {
          throw new Error('Chat not found')
        }
        
        const chatData = chatSnap.data()
        setChat(chatData)

        // Check if current user is admin
        const currentUser = auth.currentUser
        if (currentUser) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            setIsAdmin(true)
            // Add admin joined message if not already present
            if (!chatData.adminJoined) {
              await addAdminJoinedMessage()
              await updateDoc(chatRef, { adminJoined: true })
            }
          }
        }
        
        // Check item status
        const itemRef = doc(db, 'reports', chatData.itemId)
        const itemSnap = await getDoc(itemRef)
        if (itemSnap.exists()) {
          setStatus(itemSnap.data().status || 'pending')
        }
        
        const otherUserId = chatData.participants.find(id => id !== currentUser?.uid)
        if (otherUserId) {
          const userDoc = await getDoc(doc(db, 'users', otherUserId))
          if (userDoc.exists()) {
            setOtherUser(userDoc.data())
          }
        }
        
        const messagesRef = collection(db, 'chats', chatId, 'messages')
        const q = query(messagesRef, orderBy('timestamp', 'asc'))
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const messagesData = []
          snapshot.forEach((doc) => {
            const data = doc.data()
            messagesData.push({
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate()
            })
          })
          setMessages(messagesData)
          scrollToBottom()
        })
        
        unsubscribeRef.current = unsubscribe

        if (currentUser) {
          await updateDoc(chatRef, {
            [`unreadCount.${currentUser.uid}`]: 0
          })
        }
      } catch (err) {
        console.error('Error fetching chat data:', err)
        setError('Failed to load chat')
      } finally {
        setLoading(false)
      }
    }

    const addAdminJoinedMessage = async () => {
      try {
        const messagesRef = collection(db, 'chats', chatId, 'messages')
        await addDoc(messagesRef, {
          senderId: 'system',
          content: 'Admin has joined the chat to assist with verification.',
          timestamp: serverTimestamp(),
          type: 'system'
        })
        setAdminJoined(true)
      } catch (err) {
        console.error('Error adding admin joined message:', err)
      }
    }

    fetchChatData()

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [chatId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const compressImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      reader.onload = (event) => {
        const img = new window.Image()
        img.onload = () => {
          const MAX_SIZE = 800
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height
              height = MAX_SIZE
            }
          }

          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)

          const quality = 0.7
          const base64 = canvas.toDataURL('image/jpeg', quality)
          resolve(base64.split(',')[1])
        }
        img.src = event.target.result
      }
      reader.onerror = error => reject(error)
      reader.readAsDataURL(file)
    })
  }

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)

      const compressedBase64 = await compressImageToBase64(file)
      setImageBase64(compressedBase64)
    } catch (err) {
      console.error('Error processing image:', err)
      setError('Failed to process image')
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!newMessage.trim() && !imageBase64) return
    
    try {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('Not authenticated')
      
      const messagesRef = collection(db, 'chats', chatId, 'messages')
      
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        senderName: currentUser.displayName +"(Admin)"|| 'Admin',
        content: newMessage,
        imageBase64: imageBase64 || null,
        timestamp: serverTimestamp(),
        type: imageBase64 ? 'image' : 'text'
      })
      
      const chatRef = doc(db, 'chats', chatId)
      await updateDoc(chatRef, {
        lastMessage: imageBase64 ? 'Image sent' : newMessage,
        lastUpdated: serverTimestamp(),
        [`unreadCount.${otherUser?.id}`]: (chat?.unreadCount?.[otherUser?.id] || 0) + 1
      })
      
      setNewMessage('')
      setImageBase64('')
      setImagePreview('')
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
    }
  }

  const handleQuickAction = async (action) => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('Not authenticated')
      
      const messagesRef = collection(db, 'chats', chatId, 'messages')
      
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        senderName: currentUser.displayName + "(Admin)" || 'Admin',
        content: action.message,
        timestamp: serverTimestamp(),
        type: 'text'
      })
      
      const chatRef = doc(db, 'chats', chatId)
      await updateDoc(chatRef, {
        lastMessage: action.message,
        lastUpdated: serverTimestamp(),
        [`unreadCount.${otherUser?.id}`]: (chat?.unreadCount?.[otherUser?.id] || 0) + 1
      })
      
      if (action.status) {
        const itemRef = doc(db, 'reports', chat.itemId)
        await updateDoc(itemRef, {
          status: action.status,
          updatedAt: serverTimestamp()
        })
        setStatus(action.status)
      }
    } catch (err) {
      console.error('Error handling quick action:', err)
      setError('Failed to send quick action')
    }
  }

  const getSenderName = (message) => {
    if (message.senderId === 'system') return 'System'
    return message.senderName || (message.senderId === auth.currentUser?.uid ? 'You' : 'User')
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'verified':
        return <Check className="text-green-500" size={18} />
      case 'rejected':
        return <Ban className="text-red-500" size={18} />
      default:
        return <Clock className="text-yellow-500" size={18} />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2ecc71] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-[#2c3e50]">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => router.push(previousPath)}
            className="text-[#2ecc71] hover:underline font-medium"
          >
            Back to Messages
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc]">
      {/* Fixed Header */}
      <div className="bg-[#2c3e50] text-white p-4 shadow-md flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => router.push('/admindashboard/messages')}
            className="hover:bg-white/10 p-2 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>
          
          {otherUser?.photoURL && (
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <Image
                src={otherUser.photoURL}
                alt={otherUser.displayName}
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
          )}
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold">{otherUser?.displayName || 'Unknown User'}</h2>
              <div className="flex items-center gap-1 text-sm bg-white/10 px-2 py-1 rounded-full">
                {getStatusIcon()}
                <span className="capitalize">{status}</span>
              </div>
            </div>
            <p className="text-sm text-white/80">
              {chat?.itemType === 'lost' ? 'Lost Item' : 'Found Item'}: {chat?.itemName}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full scroll-smooth">
        <div className="space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`flex ${message.senderId === auth.currentUser?.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs md:max-w-md ${message.senderId === auth.currentUser?.uid ? 'items-end' : 'items-start'}`}>
                {message.senderId !== 'system' && (
                  <p className={`text-xs mb-1 ${
                    message.senderId === auth.currentUser?.uid 
                      ? 'text-right text-gray-500' 
                      : 'text-left text-gray-500'
                  }`}>
                    {getSenderName(message)}
                  </p>
                )}
                <div 
                  className={`rounded-lg p-3 ${
                    message.senderId === 'system' 
                      ? 'bg-gray-200 text-gray-800' 
                      : message.senderId === auth.currentUser?.uid 
                        ? 'bg-[#2ecc71] text-white' 
                        : 'bg-white border border-gray-200'
                  }`}
                >
                  {message.type === 'image' && message.imageBase64 && (
                    <div className="mb-2">
                      <img 
                        src={`data:image/jpeg;base64,${message.imageBase64}`}
                        alt="Sent image"
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  )}
                  {message.content && (
                    <p className={`${message.type === 'image' ? 'text-sm mt-1' : ''} whitespace-pre-line`}>
                      {message.content}
                    </p>
                  )}
                  {message.senderId !== 'system' && (
                    <p className={`text-xs mt-1 ${
                      message.senderId === auth.currentUser?.uid 
                        ? 'text-white/80' 
                        : 'text-gray-500'
                    }`}>
                      {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 max-w-4xl mx-auto w-full flex-shrink-0">
        {/* Quick Actions for Admin */}
        {isAdmin && (
          <div className="flex flex-wrap gap-2 mb-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action)}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  action.status === 'verified' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : action.status === 'rejected'
                      ? 'bg-red-100 text-red-800 hover:bg-red-200'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                {action.text}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
            />
            <label className="absolute right-2 bottom-2 cursor-pointer">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange}
                className="hidden"
              />
              <ImageIcon className="text-gray-500 hover:text-[#2ecc71]" size={20} />
            </label>
          </div>
          
          <button
            type="submit"
            disabled={!newMessage.trim() && !imageBase64}
            className="p-3 bg-[#2ecc71] text-white rounded-lg hover:bg-[#27ae60] disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </form>
        
        {imagePreview && (
          <div className="mt-2 relative">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-w-xs h-auto rounded-lg"
            />
            <button
              onClick={() => {
                setImagePreview('')
                setImageBase64('')
              }}
              className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminChatPage