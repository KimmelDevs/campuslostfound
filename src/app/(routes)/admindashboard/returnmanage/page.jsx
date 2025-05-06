'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MessageSquare, X, Check, Bell, Image as ImageIcon } from 'lucide-react'
import { doc, getDoc, updateDoc, arrayUnion, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'

const ReturnManagePage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportId = searchParams.get('id')
  const returnId = searchParams.get('returnId')
  
  const [item, setItem] = useState(null)
  const [returnRequest, setReturnRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [isParticipant, setIsParticipant] = useState(false)

  useEffect(() => {
    if (!reportId || !returnId) {
      setError('Missing report ID or return ID')
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch the report
        const reportRef = doc(db, 'reports', reportId)
        const reportSnap = await getDoc(reportRef)
        
        if (!reportSnap.exists()) {
          throw new Error('Report not found')
        }
        
        // Fetch the return request
        const returnRef = doc(db, 'reports', reportId, 'returns', returnId)
        const returnSnap = await getDoc(returnRef)
        
        if (!returnSnap.exists()) {
          throw new Error('Return request not found')
        }
        
        const returnData = returnSnap.data()
        setItem({
          id: reportSnap.id,
          ...reportSnap.data(),
          date: reportSnap.data().date || 
               (reportSnap.data().createdAt?.toDate()?.toISOString().split('T')[0] || 'Unknown date')
        })
        
        setReturnRequest({
          id: returnSnap.id,
          ...returnData,
          date: returnData.createdAt?.toDate()?.toISOString().split('T')[0] || 'Unknown date'
        })

        // Check if current user is already a participant in the chat
        if (returnData.chatId && auth.currentUser) {
          const chatRef = doc(db, 'chats', returnData.chatId)
          const chatSnap = await getDoc(chatRef)
          if (chatSnap.exists()) {
            const chatData = chatSnap.data()
            setIsParticipant(chatData.participants?.includes(auth.currentUser.uid) || false)
          }
        }
        
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [reportId, returnId])

  const sendNotification = async (userId, message, actionType) => {
    try {
      if (!userId) return;
      
      const notificationsRef = collection(db, 'users', userId, 'notifications')
      const notificationData = {
        message,
        read: false,
        createdAt: serverTimestamp(),
        type: actionType,
        reportId,
        returnId,
        itemName: item?.itemName,
        itemType: item?.type
      }
  
      // Add chatId if available
      if (returnRequest?.chatId) {
        notificationData.chatId = returnRequest.chatId
      }
      
      await addDoc(notificationsRef, notificationData)
  
      // Update user's unread notifications count
      await updateDoc(doc(db, 'users', userId), {
        unreadNotifications: arrayUnion(returnId)
      })
    } catch (err) {
      console.error('Error sending notification:', err)
    }
  }
  
  const addSystemMessage = async (chatId, content) => {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages')
      await addDoc(messagesRef, {
        senderId: 'system',
        content,
        timestamp: serverTimestamp(),
        type: 'system'
      })

      // Update chat last message
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: content,
        lastUpdated: serverTimestamp()
      })
    } catch (err) {
      console.error('Error adding system message:', err)
    }
  }

  const handleJoinChat = async () => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('You must be logged in to join the chat')
      }

      if (!returnRequest?.chatId) {
        throw new Error('No chat associated with this return request')
      }

      // Add current user as participant if not already
      if (!isParticipant) {
        await updateDoc(doc(db, 'chats', returnRequest.chatId), {
          participants: arrayUnion(currentUser.uid),
          adminJoined: true,
          lastUpdated: serverTimestamp()
        })

        // Add system message
        await addSystemMessage(returnRequest.chatId, 'Admin has joined the chat to assist with verification.')

        // Send notifications to both parties
        const notificationMessage = `An admin has joined your chat about ${item?.itemName}`
        
        if (item?.userId) {
          await sendNotification(item.userId, notificationMessage, 'admin_joined')
        }
        
        if (returnRequest?.returnerId) {
          await sendNotification(returnRequest.returnerId, notificationMessage, 'admin_joined')
        }
      }

      // Navigate to the chat
      router.push(`/admindashboard/messages/chat?id=${returnRequest.chatId}`)

    } catch (err) {
      console.error('Error joining chat:', err)
      setError(err.message)
    }
  }

  const handleReject = async () => {
    try {
      const currentDate = new Date()
      
      // Update return status in reports collection
      await updateDoc(doc(db, 'reports', reportId, 'returns', returnId), {
        status: 'rejected',
        adminNotes,
        resolvedAt: currentDate,
        resolvedBy: auth.currentUser?.uid || 'admin'
      })
      
      // Update return status in user's subcollection if it exists
      if (item?.userId) {
        const userReturnRef = doc(db, 'users', item.userId, 'reports', reportId, 'returns', returnId)
        await updateDoc(userReturnRef, {
          status: 'rejected',
          adminNotes,
          resolvedAt: currentDate,
          resolvedBy: auth.currentUser?.uid || 'admin'
        }).catch(() => console.log('User return subcollection not found'))
      }
      
      // Send notifications
      const rejectionMessage = `Your return request for "${item?.itemName}" has been rejected. ${adminNotes ? `Reason: ${adminNotes}` : ''}`
      const finderMessage = `A return request for your ${item?.type} item "${item?.itemName}" was rejected.`
      
      if (item?.userId) {
        await sendNotification(item.userId, finderMessage, 'return_rejected')
      }
      
      if (returnRequest?.returnerId) {
        await sendNotification(returnRequest.returnerId, rejectionMessage, 'return_rejected')
      }

      // Add system message to chat if it exists
      if (returnRequest?.chatId) {
        await addSystemMessage(returnRequest.chatId, 'This return request has been rejected by admin. The chat will remain open for further discussion.')
      }
      
      router.push('/admindashboard')
    } catch (err) {
      console.error('Error rejecting return:', err)
      setError('Failed to reject return request')
    }
  }

  const handleVerify = async () => {
    try {
      const currentDate = new Date()
      
      // Update return in reports collection
      await updateDoc(doc(db, 'reports', reportId, 'returns', returnId), {
        status: 'verified',
        adminNotes,
        resolvedAt: currentDate,
        resolvedBy: auth.currentUser?.uid || 'admin'
      })
      
      // Update main report status
      await updateDoc(doc(db, 'reports', reportId), {
        status: 'returned',
        resolvedAt: currentDate,
        resolvedBy: auth.currentUser?.uid || 'admin',
        resolvedReturnId: returnId
      })
      
      // Update in user's reports subcollection (finder)
      if (item?.userId) {
        const userReportRef = doc(db, 'users', item.userId, 'reports', reportId)
        await updateDoc(userReportRef, {
          status: 'returned',
          resolvedAt: currentDate,
          resolvedBy: auth.currentUser?.uid || 'admin',
          resolvedReturnId: returnId
        }).catch(() => console.log('User report not found'))
        
        // Update return in user's returns subcollection
        const userReturnRef = doc(db, 'users', item.userId, 'reports', reportId, 'returns', returnId)
        await updateDoc(userReturnRef, {
          status: 'verified',
          adminNotes,
          resolvedAt: currentDate,
          resolvedBy: auth.currentUser?.uid || 'admin'
        }).catch(() => console.log('User return subcollection not found'))
      }
      
      // Update in returner's returns subcollection if available
      if (returnRequest?.returnerId) {
        const returnerRef = doc(db, 'users', returnRequest.returnerId, 'returns', returnId)
        await updateDoc(returnerRef, {
          status: 'verified',
          adminNotes,
          resolvedAt: currentDate,
          reportId: reportId,
          resolvedBy: auth.currentUser?.uid || 'admin'
        }).catch(() => console.log('Returner return not found'))
      }
      
      // Send notifications
      const verificationMessage = `Your return request for "${item?.itemName}" has been verified! ${adminNotes ? `Notes: ${adminNotes}` : ''}`
      const finderMessage = `A return request for your ${item?.type} item "${item?.itemName}" was verified.`
      
      if (item?.userId) {
        await sendNotification(item.userId, finderMessage, 'return_verified')
      }
      
      if (returnRequest?.returnerId) {
        await sendNotification(returnRequest.returnerId, verificationMessage, 'return_verified')
      }

      // Add system message to chat if it exists
      if (returnRequest?.chatId) {
        await addSystemMessage(returnRequest.chatId, 'This return request has been verified by admin. The chat will remain open for coordination.')
      }
      
      router.push('/admindashboard')
    } catch (err) {
      console.error('Error verifying return:', err)
      setError('Failed to verify return request')
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 mt-1 bg-white rounded-xl shadow-lg">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2ecc71]"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-8 mt-1 bg-white rounded-xl shadow-lg">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={() => router.push('/admindashboard')}
          className="text-[#2ecc71] hover:underline font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (!item || !returnRequest) {
    return (
      <div className="max-w-6xl mx-auto p-8 mt-1 bg-white rounded-xl shadow-lg">
        <div className="text-gray-500 mb-4">No data found</div>
        <button 
          onClick={() => router.push('/admindashboard')}
          className="text-[#2ecc71] hover:underline font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8 mt-1 bg-white rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold text-[#2c3e50] mb-6">Return Request Verification</h1>

      {/* Item and Return Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Item Details */}
        <div>
          <h2 className="text-xl font-semibold text-[#2c3e50] mb-4 border-b pb-2">Item Details</h2>
          <div className="space-y-4">
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Item:</span>
              <span>{item.itemName}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Category:</span>
              <span className="capitalize">{item.category}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Description:</span>
              <span>{item.description || 'No description provided'}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Location Found:</span>
              <span>{item.location}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Date {item.type === 'found' ? 'Found' : 'Lost'}:</span>
              <span>{item.date}</span>
            </div>
          </div>
        </div>

        {/* Return Details */}
        <div>
          <h2 className="text-xl font-semibold text-[#2c3e50] mb-4 border-b pb-2">Return Details</h2>
          <div className="space-y-4">
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Date Submitted:</span>
              <span>{returnRequest.date}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Description:</span>
              <span className="flex-1">{returnRequest.description || 'No description provided'}</span>
            </div>
            {returnRequest.imageBase64 && (
              <div className="flex flex-col">
                <span className="font-medium text-gray-600 mb-2">Return Image:</span>
                <img 
                  src={`data:image/jpeg;base64,${returnRequest.imageBase64}`}
                  alt="Return submission"
                  className="max-w-xs h-auto rounded-lg"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Finder and Returner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Finder */}
        <div>
          <h3 className="text-lg font-semibold text-[#2c3e50] mb-3">A. Finder</h3>
          <div className="space-y-4">
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Name:</span>
              <span>{item.userName || 'Anonymous'}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Contact:</span>
              <span>{item.contactEmail || 'No contact provided'}</span>
            </div>
          </div>
        </div>

        {/* Returner */}
        <div>
          <h3 className="text-lg font-semibold text-[#2c3e50] mb-3">B. Returner</h3>
          <div className="space-y-4">
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Name:</span>
              <span>{returnRequest.returnerName || 'Anonymous'}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Contact:</span>
              <span>{returnRequest.contactInfo || 'No contact provided'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <button 
          onClick={handleJoinChat}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <MessageSquare size={18} />
          {isParticipant ? 'Go to Chat' : 'Join Chat'}
        </button>
        <div className="flex gap-3">
          <button 
            onClick={handleReject}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <X size={18} />
            Reject Return
          </button>
          <button 
            onClick={handleVerify}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Check size={18} />
            Verify Return
          </button>
        </div>
      </div>

      {/* Admin Notes */}
      <div>
        <h3 className="text-lg font-semibold text-[#2c3e50] mb-3">Admin Notes</h3>
        <textarea 
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="4"
          placeholder="Add notes about this verification process..."
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
        ></textarea>
      </div>

      {error && (
        <div className="text-red-500 mt-4">{error}</div>
      )}
    </div>
  )
}

export default ReturnManagePage