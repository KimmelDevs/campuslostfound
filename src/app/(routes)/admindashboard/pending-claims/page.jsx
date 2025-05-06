'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

function PendingVerificationsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingClaims, setPendingClaims] = useState([])
  const [pendingReturns, setPendingReturns] = useState([])
  const [activeTab, setActiveTab] = useState('claims')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        await fetchPendingData()
        setLoading(false)
      } else {
        router.replace('/sign-in')
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchPendingData = async () => {
    try {
      // Fetch reports once to use for both claims and returns
      const reportsRef = collection(db, 'reports')
      const reportsSnapshot = await getDocs(reportsRef)
      
      let claims = []
      let returns = []

      // Process each report for both claims and returns
      for (const reportDoc of reportsSnapshot.docs) {
        const reportData = reportDoc.data()
        const finderName = reportData.userName || 'Anonymous'
        
        // Process claims
        const claimsRef = collection(db, 'reports', reportDoc.id, 'claims')
        const claimsSnapshot = await getDocs(claimsRef)
        
        for (const claimDoc of claimsSnapshot.docs) {
          const claimData = claimDoc.data()
          
          if (claimData.status === 'pending') {
            const claimantName = claimData.claimantName || 'Anonymous'
            
            claims.push({
              id: claimDoc.id,
              reportId: reportDoc.id,
              ...claimData,
              item: reportData.itemName,
              category: reportData.category,
              date: claimData.createdAt?.toDate().toISOString().split('T')[0] || 'Unknown date',
              claimantName,
              finderName,
              type: 'claim'
            })
          }
        }

        // Process returns
        const returnsRef = collection(db, 'reports', reportDoc.id, 'returns')
        const returnsSnapshot = await getDocs(returnsRef)
        
        for (const returnDoc of returnsSnapshot.docs) {
          const returnData = returnDoc.data()
          
          if (returnData.status === 'pending') {
            const returnerName = returnData.returnerName || 'Anonymous'
            
            returns.push({
              id: returnDoc.id,
              reportId: reportDoc.id,
              ...returnData,
              item: reportData.itemName,
              category: reportData.category,
              date: returnData.createdAt?.toDate().toISOString().split('T')[0] || 'Unknown date',
              returnerName,
              finderName,
              type: 'return'
            })
          }
        }
      }

      // Sort by date (newest first)
      claims.sort((a, b) => new Date(b.date) - new Date(a.date))
      returns.sort((a, b) => new Date(b.date) - new Date(a.date))

      setPendingClaims(claims)
      setPendingReturns(returns)

    } catch (error) {
      console.error('Error fetching pending verifications:', error)
    }
  }

  const handleViewItem = (type, reportId, itemId) => {
    if (type === 'claim') {
      router.push(`/admindashboard/pendingmanage?id=${reportId}&claimId=${itemId}`)
    } else {
      router.push(`/admindashboard/returnmanage?id=${reportId}&returnId=${itemId}`)
    }
  }

  const filteredClaims = pendingClaims.filter(item => 
    item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.claimantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.finderName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredReturns = pendingReturns.filter(item => 
    item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.returnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.finderName.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-[#2c3e50]">Pending Verifications</h1>
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
            Claims ({pendingClaims.length})
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'returns' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => {
              setActiveTab('returns')
              setSearchTerm('')
            }}
          >
            Returns ({pendingReturns.length})
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          {activeTab === 'claims' ? (
            <>
              {filteredClaims.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claimant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finder</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredClaims.map((claim) => (
                        <tr key={`claim-${claim.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{claim.item}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{claim.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{claim.claimantName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{claim.finderName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{claim.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button 
                              onClick={() => handleViewItem('claim', claim.reportId, claim.id)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? 'No matching pending claims found' : 'There are currently no pending claims to review.'}
                </div>
              )}
            </>
          ) : (
            <>
              {filteredReturns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Returner</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finder</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredReturns.map((returnItem) => (
                        <tr key={`return-${returnItem.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{returnItem.item}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{returnItem.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{returnItem.returnerName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{returnItem.finderName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{returnItem.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button 
                              onClick={() => handleViewItem('return', returnItem.reportId, returnItem.id)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? 'No matching pending returns found' : 'There are currently no pending returns to review.'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PendingVerificationsPage