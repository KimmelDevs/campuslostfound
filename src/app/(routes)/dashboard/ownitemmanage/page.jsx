'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { doc, getDoc, collection, getDocs, query, where, limit, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { MapPin, Calendar, Tag, Mail, Phone, ArrowLeft, X, Pencil, Trash2, Check } from 'lucide-react'
import Link from 'next/link'
import ItemCard from '../_components/ItemCard'

const ItemManagePage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const itemId = searchParams.get('id')
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    itemName: '',
    category: '',
    location: '',
    date: '',
    contactEmail: '',
    contactNumber: '',
    idTag: '',
    ownerTag: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [similarItems, setSimilarItems] = useState([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)

  // Fetch item details
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
        fetchSimilarItems(itemData) // Fetch similar items after setting current item
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

  // Fetch similar items of opposite type
  const fetchSimilarItems = async (currentItem) => {
    try {
      setLoadingSimilar(true)
      const oppositeType = currentItem.type === 'lost' ? 'found' : 'lost'
      
      const q = query(
        collection(db, 'reports'),
        where('category', '==', currentItem.category),
        where('type', '==', oppositeType),
        where('__name__', '!=', currentItem.id), // Exclude current item
        limit(3)
      )
      
      const querySnapshot = await getDocs(q)
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date || 'Unknown date',
        imageUrl: doc.data().imageBase64 ? `data:image/jpeg;base64,${doc.data().imageBase64}` : null
      }))
      
      setSimilarItems(items)
    } catch (err) {
      console.error('Error fetching similar items:', err)
    } finally {
      setLoadingSimilar(false)
    }
  }

  // Initialize component
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

  // Handle edit click - populate form with current data
  const handleEditClick = () => {
    setEditing(true)
    setEditForm({
      itemName: item.itemName,
      category: item.category,
      location: item.location,
      date: item.date,
      contactEmail: item.contactEmail,
      contactNumber: item.contactNumber || '',
      idTag: item.idTag || '',
      ownerTag: item.ownerTag || '',
      description: item.description || ''
    })
  }

  // Cancel editing mode
  const handleCancelEdit = () => {
    setEditing(false)
  }

  // Handle edit submission - update both global and user-specific collections
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    
    try {
      const updatedData = {
        itemName: editForm.itemName,
        category: editForm.category,
        location: editForm.location,
        date: editForm.date,
        contactEmail: editForm.contactEmail,
        contactNumber: editForm.contactNumber,
        idTag: editForm.idTag,
        ownerTag: editForm.ownerTag,
        description: editForm.description,
        updatedAt: serverTimestamp()
      }

      // Update global report
      const globalReportRef = doc(db, 'reports', itemId)
      await updateDoc(globalReportRef, updatedData)

      // Update user-specific report if exists
      if (currentUser) {
        const userReportRef = doc(db, 'users', currentUser.uid, 'reports', itemId)
        try {
          const userReportSnap = await getDoc(userReportRef)
          if (userReportSnap.exists()) {
            await updateDoc(userReportRef, updatedData)
          }
        } catch (err) {
          console.log('User-specific report not found or error updating:', err)
        }
      }

      await fetchItem() // Refresh data
      setEditing(false)
      setSuccess('Item updated successfully')
    } catch (err) {
      console.error('Error updating item:', err)
      setError('Failed to update item')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle item deletion - delete from both collections
  const handleDeleteItem = async () => {
    if (window.confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) {
      setSubmitting(true)
      setError('')
      setSuccess('')
      
      try {
        // Delete from global collection
        const globalReportRef = doc(db, 'reports', itemId)
        await deleteDoc(globalReportRef)

        // Delete from user collection if exists
        if (currentUser) {
          const userReportRef = doc(db, 'users', currentUser.uid, 'reports', itemId)
          try {
            await deleteDoc(userReportRef)
          } catch (err) {
            console.log('User-specific report not found or error deleting:', err)
          }
        }

        setSuccess('Item deleted successfully')
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } catch (err) {
        console.error('Error deleting item:', err)
        setError('Failed to delete item')
      } finally {
        setSubmitting(false)
      }
    }
  }

  // Loading state
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

  // Error state
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

  // Item not found state
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

        {error && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
            <p>{error}</p>
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
                {editing ? (
                  <form className="space-y-4">
                    <div>
                      <label className="block text-gray-700 mb-2 font-medium">Item Name *</label>
                      <input
                        type="text"
                        value={editForm.itemName}
                        onChange={(e) => setEditForm({...editForm, itemName: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 font-medium">Category *</label>
                      <input
                        type="text"
                        value={editForm.category}
                        onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 font-medium">Location *</label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 font-medium">Date *</label>
                      <input
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 font-medium">Contact Email *</label>
                      <input
                        type="email"
                        value={editForm.contactEmail}
                        onChange={(e) => setEditForm({...editForm, contactEmail: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 font-medium">Contact Number</label>
                      <input
                        type="tel"
                        value={editForm.contactNumber}
                        onChange={(e) => setEditForm({...editForm, contactNumber: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                      />
                    </div>

                    {item.type === 'found' && (
                      <div>
                        <label className="block text-gray-700 mb-2 font-medium">Item Identification Tag</label>
                        <input
                          type="text"
                          value={editForm.idTag}
                          onChange={(e) => setEditForm({...editForm, idTag: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                        />
                      </div>
                    )}

                    {item.type === 'lost' && (
                      <div>
                        <label className="block text-gray-700 mb-2 font-medium">Owner Identification Tag</label>
                        <input
                          type="text"
                          value={editForm.ownerTag}
                          onChange={(e) => setEditForm({...editForm, ownerTag: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-gray-700 mb-2 font-medium">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                        rows={4}
                      />
                    </div>
                  </form>
                ) : (
                  <>
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
                            {item.type === 'found' ? 'Date Found' : 'Date Lost'}
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
                  </>
                )}
              </div>
            </div>

            <div className="mt-8">
              {editing ? (
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button
                    onClick={handleEditSubmit}
                    disabled={submitting}
                    className="px-4 py-2 bg-[#2ecc71] text-white hover:bg-[#27ae60] rounded-lg transition flex items-center gap-2 disabled:opacity-70"
                  >
                    <Check size={16} />
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2 text-[#2c3e50]">Description</h3>
                  <p className="text-gray-600 whitespace-pre-line">
                    {item.description || 'No description provided'}
                  </p>

                  {currentUser && currentUser.uid === item.userId && (
                    <div className="mt-8 flex justify-end gap-4">
                      <button
                        onClick={handleEditClick}
                        className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition flex items-center gap-2"
                      >
                        <Pencil size={16} />
                        Edit
                      </button>
                      <button
                        onClick={handleDeleteItem}
                        disabled={submitting}
                        className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition flex items-center gap-2 disabled:opacity-70"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Similar Items Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">
            Similar {item.type === 'lost' ? 'Found Items' : 'Lost Items'}
          </h2>
          
          {loadingSimilar ? (
            <div className="flex justify-center">
              <div className="w-8 h-8 border-2 border-[#2ecc71] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : similarItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-9">
              {similarItems.map((similarItem) => (
                <ItemCard
                  key={similarItem.id}
                  id={similarItem.id}
                  status={similarItem.type}
                  itemName={similarItem.itemName}
                  location={similarItem.location}
                  date={similarItem.date}
                  category={similarItem.category}
                  description={similarItem.description}
                  imageUrl={similarItem.imageUrl}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No similar items found</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ItemManagePage