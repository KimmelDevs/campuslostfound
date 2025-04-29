'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MapPin, Calendar, Tag, Mail, Phone, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const ItemManagePage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const itemId = searchParams.get('id')
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!itemId) {
      setError('No item ID provided')
      setLoading(false)
      return
    }

    const fetchItem = async () => {
      try {
        setLoading(true)
        const docRef = doc(db, 'reports', itemId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setItem({
            id: docSnap.id,
            ...data,
            date: data.date || (data.createdAt?.toDate()?.toISOString().split('T')[0] || 'Unknown date'),
            imageUrl: data.imageBase64 ? `data:image/jpeg;base64,${data.imageBase64}` : null
          })
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

    fetchItem()
  }, [itemId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Loading item details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/dashboard/Lostitems" className="text-blue-600 hover:underline">
            Back to Lost Items
          </Link>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Item not found</p>
          <Link href="/lostfound" className="text-blue-600 hover:underline">
            Back to Lost Items
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="mr-1" size={18} />
            Back to results
          </button>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header with status */}
          <div className={`p-4 text-white ${
            item.type === 'lost' ? 'bg-red-500' : 
            item.type === 'found' ? 'bg-green-500' : 'bg-blue-500'
          }`}>
            <h1 className="text-2xl font-bold capitalize">{item.type} Item</h1>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Image */}
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

              {/* Details */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{item.itemName}</h2>
                  <p className="text-gray-500 capitalize">{item.category}</p>
                </div>

                <div className="space-y-4">
                  {/* Location */}
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-gray-700">{item.location}</p>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-medium">
                        {item.type === 'lost' ? 'Date Lost' : 'Date Found'}
                      </p>
                      <p className="text-gray-700">{item.date}</p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="flex items-start gap-3">
                    <Mail className="mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-medium">Contact Email</p>
                      <p className="text-gray-700">{item.contactEmail}</p>
                    </div>
                  </div>

                  {item.contactNumber && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-medium">Contact Number</p>
                        <p className="text-gray-700">{item.contactNumber}</p>
                      </div>
                    </div>
                  )}

                  {/* ID/Owner Tag */}
                  {item.idTag && (
                    <div className="flex items-start gap-3">
                      <Tag className="mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-medium">Item Identification</p>
                        <p className="text-gray-700">{item.idTag}</p>
                      </div>
                    </div>
                  )}

                  {item.ownerTag && (
                    <div className="flex items-start gap-3">
                      <Tag className="mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-medium">Owner Identification</p>
                        <p className="text-gray-700">{item.ownerTag}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-line">
                {item.description || 'No description provided'}
              </p>
            </div>

            {/* Additional actions */}
            <div className="mt-8 flex justify-end gap-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                Contact Owner
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition">
                Report Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ItemManagePage