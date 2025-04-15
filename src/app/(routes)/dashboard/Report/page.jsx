'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, collection, addDoc, serverTimestamp } from 'firebase/firestore'

export default function ReportPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const fileInputRef = useRef(null)

  const [reportType, setReportType] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [formData, setFormData] = useState({
    itemName: '',
    location: '',
    date: '',
    description: '',
    contactEmail: '',
    imageBase64: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        setFormData(prev => ({ ...prev, contactEmail: firebaseUser.email || '' }))
      } else {
        router.replace('/sign-in')
      }
    })

    return () => unsubscribe()
  }, [router])

  const categories = [
    'All', 'Bag', 'Electronics', 'Book', 'Clothing', 
    'Personal Items', 'Keys', 'ID Card', 'Other'
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const compressImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          // Calculate new dimensions (max 800px)
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

          // Resize the canvas and draw the image
          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)

          // Convert to base64 with quality compression
          const quality = 0.7 // 70% quality
          const base64 = canvas.toDataURL('image/jpeg', quality)
          resolve(base64.split(',')[1]) // Remove the data URL prefix
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
      // Create preview
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)

      // Compress and convert to base64
      const compressedBase64 = await compressImageToBase64(file)
      setFormData(prev => ({ ...prev, imageBase64: compressedBase64 }))
    } catch (err) {
      console.error('Error processing image:', err)
      setError('Failed to process image')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!reportType) {
      setError('Please select report type')
      return
    }

    if (!selectedCategory || selectedCategory === 'All') {
      setError('Please select a specific category')
      return
    }

    setIsSubmitting(true)

    try {
      // Create report data
      const reportData = {
        type: reportType,
        category: selectedCategory,
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'pending',
        userId: user.uid,
        userEmail: user.email
      }

      // Add to Firestore (main reports collection)
      const reportsRef = collection(db, 'reports')
      await addDoc(reportsRef, reportData)

      // Also store in user's subcollection
      const userReportsRef = collection(db, 'users', user.uid, 'reports')
      await addDoc(userReportsRef, reportData)

      alert('Report submitted successfully!')
      router.push('/dashboard')
    } catch (err) {
      console.error('Submission error:', err)
      setError(err.message || 'Failed to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Report Item</h1>

        {/* Report Type */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">What would you like to report?</h2>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setReportType('lost')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 ${reportType === 'lost' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
            >
              Lost Item
            </button>
            <button
              type="button"
              onClick={() => setReportType('found')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 ${reportType === 'found' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
            >
              Found Item
            </button>
          </div>
        </div>

        {reportType && (
          <form onSubmit={handleSubmit}>
            {error && <p className="text-red-500 mb-4">{error}</p>}

            {/* Item Name */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Item Name *</label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg"
                required
              />
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Category *</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedCategory === cat 
                        ? 'bg-black text-white' 
                        : 'border border-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                {reportType === 'lost' ? 'Last Seen Location' : 'Found Location'} *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg"
                required
              />
            </div>

            {/* Date */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                {reportType === 'lost' ? 'Date Lost' : 'Date Found'} *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg"
                rows={4}
                required
              />
            </div>

            {/* Image Upload */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full p-3 border rounded-lg"
              />
              {imagePreview && (
                <div className="mt-4">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-w-full h-auto max-h-48 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Contact Email */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Contact Email *</label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}