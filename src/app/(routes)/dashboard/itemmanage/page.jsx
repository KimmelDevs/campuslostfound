'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { doc, getDoc, collection, getDocs, query, where, limit, addDoc, serverTimestamp, updateDoc, setDoc, arrayUnion } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { MapPin, Calendar, Tag, Mail, Phone, ArrowLeft, X } from 'lucide-react'
import Link from 'next/link'
import ItemCard from '../_components/ItemCard'

const ItemManagePage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const itemId = searchParams.get('id')
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [claimForm, setClaimForm] = useState({
    contactInfo: '',
    proof: '',
    additionalInfo: ''
  })
  const [returnForm, setReturnForm] = useState({
    description: '',
    imageBase64: ''
  })
  const [imagePreview, setImagePreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [similarItems, setSimilarItems] = useState([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)

  // Notification helper function
  const sendNotification = async (userId, message, type, relatedData) => {
    try {
      if (!userId) return;
      
      const notificationsRef = collection(db, 'users', userId, 'notifications')
      await addDoc(notificationsRef, {
        message,
        type,
        read: false,
        createdAt: serverTimestamp(),
        ...relatedData
      })

      // Update user's unread notifications count
      await updateDoc(doc(db, 'users', userId), {
        unreadNotifications: arrayUnion(relatedData.itemId || relatedData.chatId || 'notification')
      })
    } catch (err) {
      console.error('Error sending notification:', err)
    }
  }

  // Fetch similar items
  const fetchSimilarItems = async (currentItem) => {
    try {
      setLoadingSimilar(true)
      const reportsRef = collection(db, 'reports')
      
      const q = query(
        reportsRef,
        where('category', '==', currentItem.category),
        where('type', '==', currentItem.type),
        where('__name__', '!=', currentItem.id),
        limit(3)
      )
      
      const querySnapshot = await getDocs(q)
      const items = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (!currentUser || data.userId !== currentUser.uid) {
          items.push({
            id: doc.id,
            ...data,
            date: data.date || 'Unknown date',
            imageUrl: data.imageBase64 ? `data:image/jpeg;base64,${data.imageBase64}` : null
          })
        }
      })
      
      setSimilarItems(items)
    } catch (err) {
      console.error('Error fetching similar items:', err)
    } finally {
      setLoadingSimilar(false)
    }
  }

  // Fetch main item
  const fetchItem = async () => {
    try {
      setLoading(true)
      const docRef = doc(db, 'reports', itemId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        const itemData = {
          id: docSnap.id,
          ...data,
          date: data.date || 'Unknown date',
          imageUrl: data.imageBase64 ? `data:image/jpeg;base64,${data.imageBase64}` : null
        }
        setItem(itemData)
        fetchSimilarItems(itemData)
      } else {
        setError('Item not found')
      }
    } catch (err) {
      console.error('Error fetching item:', err)
      setError('Failed to load item details')
    } finally {
      setLoading(false)
    }
  }

  // Image compression
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

  // Handle image upload
  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)

      const compressedBase64 = await compressImageToBase64(file)
      setReturnForm({ ...returnForm, imageBase64: compressedBase64 })
    } catch (err) {
      console.error('Error processing image:', err)
      setError('Failed to process image')
    }
  }

  // Create chat session
  const createChatSession = async (currentUserId, otherUserId, itemId, submissionData) => {
    try {
      const chatId = [currentUserId, otherUserId].sort().join('_') + `_${itemId}`
      const chatRef = doc(db, 'chats', chatId)
      const chatSnap = await getDoc(chatRef)
      
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [currentUserId, otherUserId],
          itemId: itemId,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          lastMessage: submissionData.type === 'claim' ? 'Claim submitted' : 'Return submitted',
          unreadCount: {
            [currentUserId]: 0,
            [otherUserId]: 1
          },
          itemType: item.type,
          itemName: item.itemName,
          userNames: {
            [currentUserId]: currentUser?.displayName || 'Anonymous',
            [otherUserId]: item.userName || 'Anonymous'
          }
        })
        
        const messagesRef = collection(db, 'chats', chatId, 'messages')
        
        await addDoc(messagesRef, {
          senderId: 'system',
          content: item.type === 'found' ? 'A claim has been initiated for this lost item' : 'A return has been initiated for this found item',
          timestamp: serverTimestamp(),
          type: 'system'
        })
        
        await addDoc(messagesRef, {
          senderId: currentUserId,
          content: submissionData.details,
          timestamp: serverTimestamp(),
          type: 'submission',
          imageBase64: submissionData.image || null,
          senderName: currentUser?.displayName || 'Anonymous'
        })
      }
      
      return chatId
    } catch (err) {
      console.error('Error creating chat session:', err)
      throw err
    }
  }

  // Handle claim submission
  const handleClaimSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const submissionData = {
        type: 'claim',
        details: `Contact: ${claimForm.contactInfo}\nProof: ${claimForm.proof}\nAdditional Info: ${claimForm.additionalInfo}`,
        image: null
      }

      const currentUser = auth.currentUser
      const chatId = await createChatSession(currentUser.uid, item.userId, item.id, submissionData)

      const claimsRef = collection(db, 'reports', itemId, 'claims')
      await addDoc(claimsRef, {
        ...claimForm,
        chatId: chatId,
        createdAt: serverTimestamp(),
        status: 'pending',
        itemId: itemId,
        claimedBy: item.userId,
        claimantName: currentUser?.displayName || 'Anonymous',
        claimantId: currentUser.uid
      })

      const itemRef = doc(db, 'reports', itemId)
      await updateDoc(itemRef, {
        status: 'claim_pending',
        chatId: chatId
      })

      // Notification for claimant
      await sendNotification(
        currentUser.uid,
        `Your claim for "${item.itemName}" has been submitted successfully`,
        'claim_submitted',
        {
          itemId: item.id,
          itemName: item.itemName,
          chatId: chatId,
          actionType: 'claim'
        }
      )

      // Notification for finder
      await sendNotification(
        item.userId,
        `Someone is trying to claim your ${item.type} item "${item.itemName}"`,
        'new_claim',
        {
          itemId: item.id,
          itemName: item.itemName,
          chatId: chatId,
          actionType: 'claim'
        }
      )

      setSuccess('Your claim has been submitted for review')
      setShowClaimModal(false)
      setClaimForm({ contactInfo: '', proof: '', additionalInfo: '' })
      router.push(`/dashboard/messages/chat?id=${chatId}`)
    } catch (err) {
      console.error('Error submitting claim:', err)
      setError('Failed to submit claim')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle return submission
  const handleReturnSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const submissionData = {
        type: 'return',
        details: `I found this: ${returnForm.description}`,
        image: returnForm.imageBase64
      }

      const currentUser = auth.currentUser
      const chatId = await createChatSession(currentUser.uid, item.userId, item.id, submissionData)

      const returnsRef = collection(db, 'reports', itemId, 'returns')
      await addDoc(returnsRef, {
        ...returnForm,
        chatId: chatId,
        createdAt: serverTimestamp(),
        status: 'pending',
        itemId: itemId,
        returnedBy: item.userId,
        returnerName: currentUser?.displayName || 'Anonymous',
        returnerId: currentUser.uid
      })

      const itemRef = doc(db, 'reports', itemId)
      await updateDoc(itemRef, {
        status: 'return_pending',
        chatId: chatId
      })

      // Notification for returner
      await sendNotification(
        currentUser.uid,
        `Your return request for "${item.itemName}" has been submitted successfully`,
        'return_submitted',
        {
          itemId: item.id,
          itemName: item.itemName,
          chatId: chatId,
          actionType: 'return'
        }
      )

      // Notification for owner
      await sendNotification(
        item.userId,
        `Someone is trying to return your ${item.type} item "${item.itemName}"`,
        'new_return',
        {
          itemId: item.id,
          itemName: item.itemName,
          chatId: chatId,
          actionType: 'return'
        }
      )

      setSuccess('Your return request has been submitted')
      setShowReturnModal(false)
      setReturnForm({ description: '', imageBase64: '' })
      setImagePreview('')
      router.push(`/dashboard/messages/chat?id=${chatId}`)
    } catch (err) {
      console.error('Error submitting return:', err)
      setError('Failed to submit return request')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!itemId) {
      setError('No item ID provided')
      setLoading(false)
      return
    }

    fetchItem()
    
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user)
    })
    
    return () => unsubscribe()
  }, [itemId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2ecc71] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-[#2c3e50]">Loading item details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/dashboard" className="text-[#2ecc71] hover:underline font-medium">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <p>Item not found</p>
          <Link href="/dashboard" className="text-[#2ecc71] hover:underline font-medium">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className="flex items-center text-[#2ecc71] hover:text-[#27ae60] font-medium"
          >
            <ArrowLeft className="mr-1" size={18} />
            Back to results
          </button>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded">
            <p>{success}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className={`p-4 text-white ${
            item.type === 'found' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            <h1 className="text-2xl font-bold capitalize">{item.type} Item</h1>
            <p className="text-sm opacity-90 mt-1">
              {item.status === 'pending' ? 'Pending verification' : 
               item.status === 'resolved' ? 'Resolved' : 'Active'}
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                {item.imageUrl ? (
                  <div className="w-full h-64 md:h-80 bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.itemName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-64 md:h-80 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">No image available</span>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#2c3e50]">{item.itemName}</h2>
                  <p className="text-gray-500 capitalize">{item.category}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 flex-shrink-0 text-[#2ecc71]" size={20} />
                    <div>
                      <p className="font-medium text-gray-700">Location</p>
                      <p className="text-gray-600">{item.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="mt-1 flex-shrink-0 text-[#2ecc71]" size={20} />
                    <div>
                      <p className="font-medium text-gray-700">
                        {item.type === 'found' ? 'Date Lost' : 'Date Found'}
                      </p>
                      <p className="text-gray-600">{item.date}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="mt-1 flex-shrink-0 text-[#2ecc71]" size={20} />
                    <div>
                      <p className="font-medium text-gray-700">Contact Email</p>
                      <p className="text-gray-600">{item.contactEmail}</p>
                    </div>
                  </div>

                  {item.contactNumber && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-1 flex-shrink-0 text-[#2ecc71]" size={20} />
                      <div>
                        <p className="font-medium text-gray-700">Contact Number</p>
                        <p className="text-gray-600">{item.contactNumber}</p>
                      </div>
                    </div>
                  )}

                  {item.idTag && (
                    <div className="flex items-start gap-3">
                      <Tag className="mt-1 flex-shrink-0 text-[#2ecc71]" size={20} />
                      <div>
                        <p className="font-medium text-gray-700">Item Identification</p>
                        <p className="text-gray-600">{item.idTag}</p>
                      </div>
                    </div>
                  )}

                  {item.ownerTag && (
                    <div className="flex items-start gap-3">
                      <Tag className="mt-1 flex-shrink-0 text-[#2ecc71]" size={20} />
                      <div>
                        <p className="font-medium text-gray-700">Owner Identification</p>
                        <p className="text-gray-600">{item.ownerTag}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2 text-[#2c3e50]">Description</h3>
              <p className="text-gray-600 whitespace-pre-line">
                {item.description || 'No description provided'}
              </p>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              {currentUser && currentUser.uid !== item.userId && (
                <>
                  {item.type === 'found' ? (
                    <button 
                      onClick={() => setShowClaimModal(true)}
                      className="px-6 py-2 bg-[#2ecc71] text-white rounded-lg hover:bg-[#27ae60] transition font-medium"
                    >
                      Claim Item
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShowReturnModal(true)}
                      className="px-6 py-2 bg-[#2ecc71] text-white rounded-lg hover:bg-[#27ae60] transition font-medium"
                    >
                      Return Item
                    </button>
                  )}
                </>
              )}
              
              {currentUser && currentUser.uid === item.userId && (
                <p className="text-gray-500 italic">This is your own post</p>
              )}
            </div>
          </div>
        </div>

        {/* Similar Items Section */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-[#2c3e50]">Similar Items</h3>
          
          {loadingSimilar ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-100 rounded-lg p-4 h-64 animate-pulse"></div>
              ))}
            </div>
          ) : similarItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {similarItems.map(similarItem => (
                <ItemCard 
                  key={similarItem.id}
                  id={similarItem.id}
                  status={similarItem.type}
                  itemName={similarItem.itemName}
                  location={similarItem.location}
                  date={similarItem.date}
                  category={similarItem.category}
                  description={similarItem.description?.substring(0, 100) + (similarItem.description?.length > 100 ? '...' : '')}
                  imageUrl={similarItem.imageUrl}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No similar items found</p>
          )}
        </div>
      </div>

      {/* Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button 
              onClick={() => setShowClaimModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold mb-4 text-[#2c3e50]">Claim This Item</h2>
            <p className="text-gray-600 mb-6">Please provide proof of ownership to claim this lost item.</p>
            
            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">Contact Information *</label>
                <input
                  type="text"
                  value={claimForm.contactInfo}
                  onChange={(e) => setClaimForm({...claimForm, contactInfo: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                  placeholder="Phone number or alternative email"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-medium">Proof of Ownership *</label>
                <textarea
                  value={claimForm.proof}
                  onChange={(e) => setClaimForm({...claimForm, proof: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                  placeholder="Describe how you can prove this is your item (unique features, purchase receipt, etc.)"
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-medium">Additional Information</label>
                <textarea
                  value={claimForm.additionalInfo}
                  onChange={(e) => setClaimForm({...claimForm, additionalInfo: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                  placeholder="Any other details that can help verify your claim"
                  rows={2}
                />
              </div>
              
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#2ecc71] text-white hover:bg-[#27ae60] rounded-lg transition disabled:opacity-70"
                >
                  {submitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button 
              onClick={() => setShowReturnModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold mb-4 text-[#2c3e50]">Return Found Item</h2>
            <p className="text-gray-600 mb-6">Please provide details about how you found this item.</p>
            
            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">Upload Current Photo *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                  required
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="max-w-full h-auto max-h-32 rounded-lg"
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 font-medium">Description of How You Found It *</label>
                <textarea
                  value={returnForm.description}
                  onChange={(e) => setReturnForm({...returnForm, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                  placeholder="Where and how did you find this item?"
                  rows={4}
                  required
                />
              </div>
              
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#2ecc71] text-white hover:bg-[#27ae60] rounded-lg transition disabled:opacity-70"
                >
                  {submitting ? 'Submitting...' : 'Submit Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ItemManagePage