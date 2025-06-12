'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { doc, getDoc,getDocs, collection, addDoc, serverTimestamp, onSnapshot, updateDoc, query, orderBy, where, limit } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { ArrowLeft, Image as ImageIcon, Send, X, Check, Clock, Ban, Info } from 'lucide-react'
import Image from 'next/image'

const ChatPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const chatId = searchParams.get('id')
  const [chat, setChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [otherUser, setOtherUser] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [imageBase64, setImageBase64] = useState('')
  const [status, setStatus] = useState('pending')
  const [showInfoTooltip, setShowInfoTooltip] = useState(false)
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const unsubscribeRef = useRef(null)
  const infoIconRef = useRef(null)

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

        // Fetch item status
        if (chatData.itemId) {
          const itemDoc = await getDoc(doc(db, 'reports', chatData.itemId))
          if (itemDoc.exists()) {
            setStatus(itemDoc.data().status || 'pending')

            // Check for return submission with image
            const returnsRef = collection(db, 'reports', chatData.itemId, 'returns')
            const returnsQuery = query(returnsRef, orderBy('createdAt', 'desc'), limit(1))
            const returnsSnapshot = await getDocs(returnsQuery)
            
            if (!returnsSnapshot.empty) {
              const returnData = returnsSnapshot.docs[0].data()
              if (returnData.imageBase64) {
                // Check if this return image is already in messages
                const messagesRef = collection(db, 'chats', chatId, 'messages')
                const existingReturnImage = await getDocs(
                  query(messagesRef, 
                    where('type', '==', 'return_image'),
                    limit(1)
                  )
                )

                if (existingReturnImage.empty) {
                  // Add return image to chat if not already present
                  await addDoc(messagesRef, {
                    senderId: returnData.returnerId || 'system',
                    senderName: returnData.returnerName || 'Return Submission',
                    content: 'Item return image submitted',
                    imageBase64: returnData.imageBase64,
                    timestamp: returnData.createdAt || serverTimestamp(),
                    type: 'return_image'
                  })
                }
              }
            }
          }
        }
        
        const currentUser = auth.currentUser
        if (currentUser) {
          // Get other user data for the chat header
          const otherUserId = chatData.participants.find(id => id !== currentUser.uid)
          if (otherUserId) {
            const userDoc = await getDoc(doc(db, 'users', otherUserId))
            if (userDoc.exists()) {
              setOtherUser(userDoc.data())
            }
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

  const getStatusBadge = () => {
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
      case 'return_pending':
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-800 text-xs">
            <Clock size={14} />
            <span>Return Pending</span>
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
        senderName: currentUser.displayName || 'Anonymous',
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

  const getSenderName = (message) => {
    if (message.senderId === 'system') return 'System'
    if (message.type === 'return_image') return 'Return Submission'
    return message.senderName || 'Unknown User'
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
            onClick={() => router.push('/dashboard/messages')}
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
      <div className="bg-[#2c3e50] text-white p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard/messages')}
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
              
            </div>
            <p className="text-sm text-white/80">
              {chat?.itemType === 'lost' ? 'Lost Item' : 'Found Item'}: {chat?.itemName}
            </p>
          </div>

          {/* Information Icon with Tooltip */}
            
        </div>
      </div>

      {/* Scrollable Chat Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`flex ${message.senderId === auth.currentUser?.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs md:max-w-md ${message.senderId === auth.currentUser?.uid ? 'items-end' : 'items-start'}`}>
                {message.senderId !== 'system' && message.type !== 'return_image' && (
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
                    message.type === 'return_image'
                      ? 'bg-white border border-gray-200'
                      : message.senderId === 'system' 
                        ? 'bg-gray-200 text-gray-800' 
                        : message.senderId === auth.currentUser?.uid 
                          ? message.senderName?.includes("(Admin)") 
                            ? 'bg-blue-500 text-white'
                            : 'bg-[#2ecc71] text-white'
                          : message.senderName?.includes("(Admin)") 
                            ? 'bg-blue-500 text-white'
                            : 'bg-white border border-gray-200'
                  }`}
                >
                  {(message.type === 'image' || message.type === 'return_image') && message.imageBase64 && (
                    <div className="mb-2">
                      <img 
                        src={`data:image/jpeg;base64,${message.imageBase64}`}
                        alt={message.type === 'return_image' ? 'Return submission' : 'Sent image'}
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  )}
                  {message.content && (
                    <p className={`${message.type === 'image' || message.type === 'return_image' ? 'text-sm mt-1' : ''} whitespace-pre-line`}>
                      {message.content}
                    </p>
                  )}
                  {message.senderId !== 'system' && message.type !== 'return_image' && (
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
      <div className="bg-white border-t border-gray-200 p-4 max-w-4xl mx-auto w-full">
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

export default ChatPage