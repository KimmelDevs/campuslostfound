'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

function VerifiedClaimsReturnsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [verifiedClaims, setVerifiedClaims] = useState([])
  const [verifiedReturns, setVerifiedReturns] = useState([])
  const [activeTab, setActiveTab] = useState('claims')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        await fetchClaimsData()
        await fetchReturnsData()
        setLoading(false)
      } else {
        router.replace('/sign-in')
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchClaimsData = async () => {
    try {
      const reportsRef = collection(db, 'reports')
      const reportsSnapshot = await getDocs(reportsRef)
      
      let verified = []

      for (const reportDoc of reportsSnapshot.docs) {
        const reportData = reportDoc.data()
        const finderName = reportData.userName || 'Anonymous'
        
        const claimsRef = collection(db, 'reports', reportDoc.id, 'claims')
        const claimsSnapshot = await getDocs(claimsRef)
        
        for (const claimDoc of claimsSnapshot.docs) {
          const claimData = claimDoc.data()
          
          if (claimData.status === 'verified') {
            const claimantName = claimData.claimantName || 'Anonymous'
            
            verified.push({
              id: claimDoc.id,
              reportId: reportDoc.id,
              ...claimData,
              item: reportData.itemName,
              category: reportData.category,
              date: claimData.createdAt?.toDate().toISOString().split('T')[0] || 'Unknown date',
              claimantName,
              finderName
            })
          }
        }
      }

      verified.sort((a, b) => new Date(b.date) - new Date(a.date))
      setVerifiedClaims(verified)

    } catch (error) {
      console.error('Error fetching verified claims:', error)
    }
  }

  const fetchReturnsData = async () => {
    try {
      const reportsRef = collection(db, 'reports')
      const reportsSnapshot = await getDocs(reportsRef)
      
      let verified = []

      for (const reportDoc of reportsSnapshot.docs) {
        const reportData = reportDoc.data()
        const finderName = reportData.userName || 'Anonymous'
        
        const returnsRef = collection(db, 'reports', reportDoc.id, 'returns')
        const returnsSnapshot = await getDocs(returnsRef)
        
        for (const returnDoc of returnsSnapshot.docs) {
          const returnData = returnDoc.data()
          
          if (returnData.status === 'verified') {
            const returnerName = returnData.returnerName || 'Anonymous'
            
            verified.push({
              id: returnDoc.id,
              reportId: reportDoc.id,
              ...returnData,
              item: reportData.itemName,
              category: reportData.category,
              date: returnData.createdAt?.toDate().toISOString().split('T')[0] || 'Unknown date',
              returnerName,
              finderName
            })
          }
        }
      }

      verified.sort((a, b) => new Date(b.date) - new Date(a.date))
      setVerifiedReturns(verified)

    } catch (error) {
      console.error('Error fetching verified returns:', error)
    }
  }

  const filteredClaims = verifiedClaims.filter(claim => 
    claim.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.claimantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.finderName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredReturns = verifiedReturns.filter(returnItem => 
    returnItem.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    returnItem.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    returnItem.returnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    returnItem.finderName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2ecc71] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-[#2c3e50]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-8 pb-12">
        <div className="flex justify-between items-center mb-8 pt-6">
          <h1 className="text-3xl font-bold text-[#2c3e50]">Verified Claims & Returns</h1>
          <div className="relative w-64">
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex border-b mb-6">
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'claims' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => {
              setActiveTab('claims')
              setSearchTerm('')
            }}
          >
            Verified Claims ({verifiedClaims.length})
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'returns' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => {
              setActiveTab('returns')
              setSearchTerm('')
            }}
          >
            Verified Returns ({verifiedReturns.length})
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          {activeTab === 'claims' ? (
            <>
              {filteredClaims.length > 0 ? (
                <div className="space-y-4">
                  {filteredClaims.map((claim) => (
                    <div key={claim.id} className="border-l-4 border-green-500 pl-4 py-3">
                      <h3 className="text-lg font-medium text-gray-900">{claim.item}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        <div>
                          <p className="text-xs text-gray-400">Category</p>
                          <p className="text-sm text-gray-600 capitalize">{claim.category}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Claimant</p>
                          <p className="text-sm text-gray-600">{claim.claimantName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Finder</p>
                          <p className="text-sm text-gray-600">{claim.finderName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Verified on</p>
                          <p className="text-sm text-gray-600">{claim.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? 'No matching verified claims found' : 'There are currently no verified claims.'}
                </div>
              )}
            </>
          ) : (
            <>
              {filteredReturns.length > 0 ? (
                <div className="space-y-4">
                  {filteredReturns.map((returnItem) => (
                    <div key={returnItem.id} className="border-l-4 border-green-500 pl-4 py-3">
                      <h3 className="text-lg font-medium text-gray-900">{returnItem.item}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        <div>
                          <p className="text-xs text-gray-400">Category</p>
                          <p className="text-sm text-gray-600 capitalize">{returnItem.category}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Returner</p>
                          <p className="text-sm text-gray-600">{returnItem.returnerName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Finder</p>
                          <p className="text-sm text-gray-600">{returnItem.finderName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Verified on</p>
                          <p className="text-sm text-gray-600">{returnItem.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? 'No matching verified returns found' : 'There are currently no verified returns.'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifiedClaimsReturnsPage