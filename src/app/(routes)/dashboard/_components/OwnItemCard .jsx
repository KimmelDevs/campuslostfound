import React from 'react'
import { MapPin, Calendar, Tag } from 'lucide-react'
import Link from 'next/link'

const ItemCard = ({ 
  id,
  status = 'unknown',
  itemName = 'Unnamed Item', 
  location = 'Unknown location', 
  date = 'Unknown date', 
  category = 'Uncategorized',
  description,
  imageUrl
}) => {
  const capitalizeFirstLetter = (str) => {
    if (!str || typeof str !== 'string') return 'Unknown'
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Function to truncate text after 27 characters
  const truncateText = (text, maxLength = 24) => {
    if (!text) return 'Unknown'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const renderImage = () => {
    if (!imageUrl) {
      return (
        <div className="w-full h-[200px] bg-gray-200 flex items-center justify-center">
          <span className="text-base text-gray-500">No Image</span>
        </div>
      )
    }

    return (
      <div className="w-full h-[200px] bg-gray-200 overflow-hidden">
        <img 
          src={imageUrl}
          alt={itemName}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null
            e.target.parentElement.innerHTML = `
              <div class="w-full h-full bg-gray-200 flex items-center justify-center">
                <span class="text-base text-gray-500">Image Error</span>
              </div>
            `
          }}
        />
      </div>
    )
  }

  return (
    <div className="w-[330px] h-[412px] border rounded-xl shadow-lg relative bg-white overflow-hidden flex flex-col">
      {/* Image */}
      {renderImage()}

      {/* Status Tag */}
      <div className={`absolute top-3 right-3 text-white text-sm px-3 py-1.5 rounded
        ${status === 'lost' ? 'bg-red-500' : 
          status === 'found' ? 'bg-green-500' : 'bg-blue-500'}`}>
        {capitalizeFirstLetter(status)}
      </div>

      {/* Details */}
      <div className="p-4 space-y-2 text-base flex-grow flex flex-col">
        {/* Truncated Item Name (max 27 chars) */}
        <h3 className="text-lg font-semibold text-gray-900" title={itemName}>
          {truncateText(itemName)}
        </h3>

        <div className="flex items-center gap-2 text-gray-700">
          <MapPin size={20} className="flex-shrink-0" /> 
          <span className="truncate">{location}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Calendar size={20} className="flex-shrink-0" /> 
          <span className="truncate">{date}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Tag size={20} className="flex-shrink-0" /> 
          <span className="truncate">{category}</span>
        </div>
        {description && (
          <p className="text-gray-600 text-sm line-clamp-2">{description}</p>
        )}
        <div className="text-right mt-auto">
          <Link 
            href={`/dashboard/ownitemmanage?id=${id}`} 
            className="text-blue-600 text-sm hover:underline"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ItemCard