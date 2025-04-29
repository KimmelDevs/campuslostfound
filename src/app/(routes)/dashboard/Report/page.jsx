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
    contactNumber: '',
    idTag: '',
    ownerTag: '',
    imageBase64: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        setFormData(prev => ({ 
          ...prev, 
          contactEmail: firebaseUser.email || '',
          contactNumber: firebaseUser.phoneNumber || '' 
        }))
      } else {
        router.replace('/sign-in')
      }
    })

    return () => unsubscribe()
  }, [router])

  const categories = [
    'Bag', 'Electronics', 'Book', 'Clothing', 
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

    if (!selectedCategory) {
      setError('Please select a category')
      return
    }

    setIsSubmitting(true)

    try {
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

      const reportsRef = collection(db, 'reports')
      await addDoc(reportsRef, reportData)

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
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-8 text-[#2c3e50]">Report Item</h1>

        {/* Report Type */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-[#2c3e50]">What would you like to report?</h2>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setReportType('lost')}
              className={`flex-1 py-4 px-4 rounded-lg border-2 text-lg font-medium ${
                reportType === 'lost' 
                  ? 'border-[#2ecc71] bg-[#2ecc71]/10 text-[#2ecc71]' 
                  : 'border-gray-300 text-gray-500 hover:border-[#2ecc71]'
              }`}
            >
              Lost Item
            </button>
            <button
              type="button"
              onClick={() => setReportType('found')}
              className={`flex-1 py-4 px-4 rounded-lg border-2 text-lg font-medium ${
                reportType === 'found' 
                  ? 'border-[#2ecc71] bg-[#2ecc71]/10 text-[#2ecc71]' 
                  : 'border-gray-300 text-gray-500 hover:border-[#2ecc71]'
              }`}
            >
              Found Item
            </button>
          </div>
        </div>

        {reportType && (
          <form onSubmit={handleSubmit}>
            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">{error}</div>}

            {/* Item Name */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 font-medium">Item Name *</label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                required
              />
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 font-medium">Category *</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      selectedCategory === cat 
                        ? 'bg-[#2ecc71] text-white' 
                        : 'bg-gray-100 text-[#2c3e50] hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 font-medium">
                {reportType === 'lost' ? 'Last Seen Location' : 'Found Location'} *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                required
              />
            </div>

            {/* Date */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 font-medium">
                {reportType === 'lost' ? 'Date Lost' : 'Date Found'} *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 font-medium">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                rows={4}
                required
              />
            </div>

            {/* ID Tag/Owner Tag */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 font-medium">
                {reportType === 'lost' ? 'Owner Identification Tag' : 'Item Identification Tag'}
              </label>
              <input
                type="text"
                name={reportType === 'lost' ? 'ownerTag' : 'idTag'}
                value={reportType === 'lost' ? formData.ownerTag : formData.idTag}
                onChange={handleInputChange}
                placeholder={reportType === 'lost' ? 'Any identifying marks or owner info' : 'Any ID numbers or tags on the item'}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">Contact Email *</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 font-medium">Contact Number *</label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., +09 6383 3738"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Image Upload */}
            <div className="mb-8">
              <label className="block text-gray-700 mb-2 font-medium">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={fileInputRef}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#2ecc71] text-white py-3 rounded-lg hover:bg-[#27ae60] transition disabled:bg-[#2ecc71]/70 font-medium text-lg"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}