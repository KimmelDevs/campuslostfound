'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MessageSquare, X, Check, Bell } from 'lucide-react'
import { doc, getDoc, updateDoc, arrayUnion, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'

const PendingManagePage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportId = searchParams.get('id')
  const claimId = searchParams.get('claimId')
  
  const [item, setItem] = useState(null)
  const [claim, setClaim] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [isParticipant, setIsParticipant] = useState(false)

  useEffect(() => {
    if (!reportId || !claimId) {
      setError('Missing report ID or claim ID')
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
        
        // Fetch the claim
        const claimRef = doc(db, 'reports', reportId, 'claims', claimId)
        const claimSnap = await getDoc(claimRef)
        
        if (!claimSnap.exists()) {
          throw new Error('Claim not found')
        }
        
        const claimData = claimSnap.data()
        setItem({
          id: reportSnap.id,
          ...reportSnap.data(),
          date: reportSnap.data().date || 
               (reportSnap.data().createdAt?.toDate()?.toISOString().split('T')[0] || 'Unknown date')
        })
        
        setClaim({
          id: claimSnap.id,
          ...claimData,
          date: claimData.createdAt?.toDate()?.toISOString().split('T')[0] || 'Unknown date'
        })

        // Check if current user is already a participant in the chat
        if (claimData.chatId && auth.currentUser) {
          const chatRef = doc(db, 'chats', claimData.chatId)
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
  }, [reportId, claimId])

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
        claimId,
        itemName: item?.itemName,
        itemType: item?.type
      }
  
      // Add chatId if available
      if (claim?.chatId) {
        notificationData.chatId = claim.chatId
      }
      
      await addDoc(notificationsRef, notificationData)
  
      // Update user's unread notifications count
      await updateDoc(doc(db, 'users', userId), {
        unreadNotifications: arrayUnion(claimId)
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

      if (!claim?.chatId) {
        throw new Error('No chat associated with this claim')
      }

      // Add current user as participant if not already
      if (!isParticipant) {
        await updateDoc(doc(db, 'chats', claim.chatId), {
          participants: arrayUnion(currentUser.uid),
          adminJoined: true,
          lastUpdated: serverTimestamp()
        })

        // Add system message
        await addSystemMessage(claim.chatId, 'Admin has joined the chat to assist with verification.')

        // Send notifications to both parties
        const notificationMessage = `An admin has joined your chat about ${item?.itemName}`
        
        if (item?.userId) {
          await sendNotification(item.userId, notificationMessage, 'admin_joined')
        }
        
        if (claim?.claimantId) {
          await sendNotification(claim.claimantId, notificationMessage, 'admin_joined')
        }
      }

      // Navigate to the chat
      router.push(`/admindashboard/messages/chat?id=${claim.chatId}`)

    } catch (err) {
      console.error('Error joining chat:', err)
      setError(err.message)
    }
  }

  const handleReject = async () => {
    try {
      const currentDate = new Date()
      
      // Update claim status in reports collection
      await updateDoc(doc(db, 'reports', reportId, 'claims', claimId), {
        status: 'rejected',
        adminNotes,
        resolvedAt: currentDate,
        resolvedBy: auth.currentUser?.uid || 'admin'
      })
      
      // Update claim status in user's subcollection if it exists
      if (item?.userId) {
        const userClaimRef = doc(db, 'users', item.userId, 'reports', reportId, 'claims', claimId)
        await updateDoc(userClaimRef, {
          status: 'rejected',
          adminNotes,
          resolvedAt: currentDate,
          resolvedBy: auth.currentUser?.uid || 'admin'
        }).catch(() => console.log('User claim subcollection not found'))
      }
      
      // Send notifications
      const rejectionMessage = `Your claim for "${item?.itemName}" has been rejected. ${adminNotes ? `Reason: ${adminNotes}` : ''}`
      const finderMessage = `A claim for your ${item?.type} item "${item?.itemName}" was rejected.`
      
      if (item?.userId) {
        await sendNotification(item.userId, finderMessage, 'claim_rejected')
      }
      
      if (claim?.claimantId) {
        await sendNotification(claim.claimantId, rejectionMessage, 'claim_rejected')
      }

      // Add system message to chat if it exists
      if (claim?.chatId) {
        await addSystemMessage(claim.chatId, 'This claim has been rejected by admin. The chat will remain open for further discussion.')
      }
      
      router.push('/admindashboard')
    } catch (err) {
      console.error('Error rejecting claim:', err)
      setError('Failed to reject claim')
    }
  }

  const handleVerify = async () => {
    try {
      const currentDate = new Date()
      
      // Update claim in reports collection
      await updateDoc(doc(db, 'reports', reportId, 'claims', claimId), {
        status: 'verified',
        adminNotes,
        resolvedAt: currentDate,
        resolvedBy: auth.currentUser?.uid || 'admin'
      })
      
      // Update main report status
      await updateDoc(doc(db, 'reports', reportId), {
        status: 'resolved',
        resolvedAt: currentDate,
        resolvedBy: auth.currentUser?.uid || 'admin',
        resolvedClaimId: claimId
      })
      
      // Update in user's reports subcollection (finder)
      if (item?.userId) {
        const userReportRef = doc(db, 'users', item.userId, 'reports', reportId)
        await updateDoc(userReportRef, {
          status: 'resolved',
          resolvedAt: currentDate,
          resolvedBy: auth.currentUser?.uid || 'admin',
          resolvedClaimId: claimId
        }).catch(() => console.log('User report not found'))
        
        // Update claim in user's claims subcollection
        const userClaimRef = doc(db, 'users', item.userId, 'reports', reportId, 'claims', claimId)
        await updateDoc(userClaimRef, {
          status: 'verified',
          adminNotes,
          resolvedAt: currentDate,
          resolvedBy: auth.currentUser?.uid || 'admin'
        }).catch(() => console.log('User claim subcollection not found'))
      }
      
      // Update in claimant's claims subcollection if available
      if (claim?.claimantId) {
        const claimantRef = doc(db, 'users', claim.claimantId, 'claims', claimId)
        await updateDoc(claimantRef, {
          status: 'verified',
          adminNotes,
          resolvedAt: currentDate,
          reportId: reportId,
          resolvedBy: auth.currentUser?.uid || 'admin'
        }).catch(() => console.log('Claimant claim not found'))
      }
      
      // Send notifications
      const verificationMessage = `Your claim for "${item?.itemName}" has been verified! ${adminNotes ? `Notes: ${adminNotes}` : ''}`
      const finderMessage = `A claim for your ${item?.type} item "${item?.itemName}" was verified.`
      
      if (item?.userId) {
        await sendNotification(item.userId, finderMessage, 'claim_verified')
      }
      
      if (claim?.claimantId) {
        await sendNotification(claim.claimantId, verificationMessage, 'claim_verified')
      }

      // Add system message to chat if it exists
      if (claim?.chatId) {
        await addSystemMessage(claim.chatId, 'This claim has been verified by admin. The chat will remain open for coordination.')
      }
      
      router.push('/admindashboard')
    } catch (err) {
      console.error('Error verifying claim:', err)
      setError('Failed to verify claim')
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

  if (!item || !claim) {
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
      <h1 className="text-2xl font-bold text-[#2c3e50] mb-6">Claim Verification</h1>

      {/* Item and Claim Details */}
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

        {/* Claim Details */}
        <div>
          <h2 className="text-xl font-semibold text-[#2c3e50] mb-4 border-b pb-2">Claim Details</h2>
          <div className="space-y-4">
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Date Claimed:</span>
              <span>{claim.date}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Proof:</span>
              <span className="flex-1">{claim.proof || 'No proof provided'}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Additional Info:</span>
              <span className="flex-1">{claim.additionalInfo || 'None'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Finder and Claimant */}
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

        {/* Claimant */}
        <div>
          <h3 className="text-lg font-semibold text-[#2c3e50] mb-3">B. Claimant</h3>
          <div className="space-y-4">
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Name:</span>
              <span>{claim.claimantName || 'Anonymous'}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-600 w-32">Contact:</span>
              <span>{claim.contactInfo || 'No contact provided'}</span>
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
            Reject Claim
          </button>
          <button 
            onClick={handleVerify}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Check size={18} />
            Verify Claim
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

export default PendingManagePage