'use client'

import React, { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingClaims, setPendingClaims] = useState([])
  const [verifiedClaims, setVerifiedClaims] = useState([])
  const [rejectedClaims, setRejectedClaims] = useState([])
  const [pendingReturns, setPendingReturns] = useState([])
  const [verifiedReturns, setVerifiedReturns] = useState([])
  const [rejectedReturns, setRejectedReturns] = useState([])
  const [stats, setStats] = useState({
    pendingClaims: 0,
    verifiedClaims: 0,
    rejectedClaims: 0,
    pendingReturns: 0,
    verifiedReturns: 0,
    rejectedReturns: 0
  })

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
      // Get all reports with claims subcollections
      const reportsRef = collection(db, 'reports')
      const reportsSnapshot = await getDocs(reportsRef)
      
      let pending = []
      let verified = []
      let rejected = []
      let pendingCount = 0
      let verifiedCount = 0
      let rejectedCount = 0

      // Process each report
      for (const reportDoc of reportsSnapshot.docs) {
        const reportData = reportDoc.data()
        
        // Get the finder's display name (from the report)
        const finderName = reportData.userName || 'Anonymous'
        
        // Get claims subcollection
        const claimsRef = collection(db, 'reports', reportDoc.id, 'claims')
        const claimsSnapshot = await getDocs(claimsRef)
        
        for (const claimDoc of claimsSnapshot.docs) {
          const claimData = claimDoc.data()
          
          // Get claimant's display name (from the claim)
          const claimantName = claimData.claimantName || 'Anonymous'
          
          const claimWithId = {
            id: claimDoc.id,
            reportId: reportDoc.id,
            ...claimData,
            item: reportData.itemName,
            category: reportData.category,
            date: claimData.createdAt?.toDate().toISOString().split('T')[0] || 'Unknown date',
            claimantName,
            finderName
          }

          if (claimData.status === 'pending') {
            pendingCount++
            if (pending.length < 5) {
              pending.push(claimWithId)
            }
          } else if (claimData.status === 'verified') {
            verifiedCount++
            if (verified.length < 2) {
              verified.push(claimWithId)
            }
          } else if (claimData.status === 'rejected') {
            rejectedCount++
            if (rejected.length < 2) {
              rejected.push(claimWithId)
            }
          }
        }
      }

      // Sort claims by date (newest first)
      pending.sort((a, b) => new Date(b.date) - new Date(a.date))
      verified.sort((a, b) => new Date(b.date) - new Date(a.date))
      rejected.sort((a, b) => new Date(b.date) - new Date(a.date))

      setPendingClaims(pending)
      setVerifiedClaims(verified)
      setRejectedClaims(rejected)
      setStats(prev => ({
        ...prev,
        pendingClaims: pendingCount,
        verifiedClaims: verifiedCount,
        rejectedClaims: rejectedCount
      }))

    } catch (error) {
      console.error('Error fetching claims:', error)
    }
  }

  const fetchReturnsData = async () => {
    try {
      // Get all reports with returns subcollections
      const reportsRef = collection(db, 'reports')
      const reportsSnapshot = await getDocs(reportsRef)
      
      let pending = []
      let verified = []
      let rejected = []
      let pendingCount = 0
      let verifiedCount = 0
      let rejectedCount = 0

      // Process each report
      for (const reportDoc of reportsSnapshot.docs) {
        const reportData = reportDoc.data()
        
        // Get returns subcollection
        const returnsRef = collection(db, 'reports', reportDoc.id, 'returns')
        const returnsSnapshot = await getDocs(returnsRef)
        
        for (const returnDoc of returnsSnapshot.docs) {
          const returnData = returnDoc.data()
          
          // Get returner's display name
          const returnerName = returnData.returnerName || 'Anonymous'
          
          const returnWithId = {
            id: returnDoc.id,
            reportId: reportDoc.id,
            ...returnData,
            item: reportData.itemName,
            category: reportData.category,
            date: returnData.createdAt?.toDate().toISOString().split('T')[0] || 'Unknown date',
            returnerName,
            finderName: reportData.userName || 'Anonymous'
          }

          if (returnData.status === 'pending') {
            pendingCount++
            if (pending.length < 5) {
              pending.push(returnWithId)
            }
          } else if (returnData.status === 'verified') {
            verifiedCount++
            if (verified.length < 2) {
              verified.push(returnWithId)
            }
          } else if (returnData.status === 'rejected') {
            rejectedCount++
            if (rejected.length < 2) {
              rejected.push(returnWithId)
            }
          }
        }
      }

      // Sort returns by date (newest first)
      pending.sort((a, b) => new Date(b.date) - new Date(a.date))
      verified.sort((a, b) => new Date(b.date) - new Date(a.date))
      rejected.sort((a, b) => new Date(b.date) - new Date(a.date))

      setPendingReturns(pending)
      setVerifiedReturns(verified)
      setRejectedReturns(rejected)
      setStats(prev => ({
        ...prev,
        pendingReturns: pendingCount,
        verifiedReturns: verifiedCount,
        rejectedReturns: rejectedCount
      }))

    } catch (error) {
      console.error('Error fetching returns:', error)
    }
  }

  const handleViewClaim = (reportId, claimId) => {
    router.push(`/admindashboard/pendingmanage?id=${reportId}&claimId=${claimId}`)
  }

  const handleViewReturn = (reportId, returnId) => {
    router.push(`/admindashboard/returnmanage?id=${reportId}&returnId=${returnId}`)
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2ecc71] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-[#2c3e50]">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 pb-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-6 mb-8 mt-2">
          {/* Claims Stats */}
          <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-yellow-500">
            <h3 className="text-gray-500 text-sm font-medium">Pending Claims</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{stats.pendingClaims}</p>
          </div>
          <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-green-500">
            <h3 className="text-gray-500 text-sm font-medium">Verified Claims</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{stats.verifiedClaims}</p>
          </div>
          <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-red-500">
            <h3 className="text-gray-500 text-sm font-medium">Rejected Claims</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{stats.rejectedClaims}</p>
          </div>
          
          </div>

        {/* Pending Claims Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Pending Claims Verification</h2>
          
          {pendingClaims.length > 0 ? (
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
                  {pendingClaims.map((claim) => (
                    <tr key={claim.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{claim.item}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{claim.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{claim.claimantName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{claim.finderName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{claim.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button 
                          onClick={() => handleViewClaim(claim.reportId, claim.id)}
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
            <div className="text-center py-8 text-gray-500">
              There are currently no pending claims to review.
            </div>
          )}
        </div>
        {/* Verified and Rejected Sections - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Verified Claims Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Recently Verified Claims</h2>
            
            {verifiedClaims.length > 0 ? (
              <div className="space-y-4">
                {verifiedClaims.map((claim) => (
                  <div key={claim.id} className="border-l-4 border-green-500 pl-4 py-2">
                    <h3 className="text-lg font-medium text-gray-900">{claim.item}</h3>
                    <p className="text-sm text-gray-500">Claimant: {claim.claimantName}</p>
                    <p className="text-sm text-gray-500">Finder: {claim.finderName}</p>
                    <p className="text-sm text-gray-500">Verified on {claim.date}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 py-4">
                No verified claims to display.
              </div>
            )}
          </div>

          {/* Rejected Claims Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Recently Rejected Claims</h2>
            
            {rejectedClaims.length > 0 ? (
              <div className="space-y-4">
                {rejectedClaims.map((claim) => (
                  <div key={claim.id} className="border-l-4 border-red-500 pl-4 py-2">
                    <h3 className="text-lg font-medium text-gray-900">{claim.item}</h3>
                    <p className="text-sm text-gray-500">Claimant: {claim.claimantName}</p>
                    <p className="text-sm text-gray-500">Finder: {claim.finderName}</p>
                    <p className="text-sm text-gray-500">Rejected on {claim.date}</p>
                    {claim.additionalInfo && (
                      <p className="text-sm text-gray-500 mt-1">Reason: {claim.additionalInfo}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 py-4">
                No rejected claims to display.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-6 mb-8 mt-2">
          {/* Returns Stats */}
          <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-yellow-500">
            <h3 className="text-gray-500 text-sm font-medium">Pending Returns</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{stats.pendingReturns}</p>
          </div>
          <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-green-500">
            <h3 className="text-gray-500 text-sm font-medium">Verified Returns</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{stats.verifiedReturns}</p>
          </div>
          <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-red-500">
            <h3 className="text-gray-500 text-sm font-medium">Rejected Returns</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{stats.rejectedReturns}</p>
          </div>
        

        </div>

        {/* Pending Returns Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Pending Returns Verification</h2>
          
          {pendingReturns.length > 0 ? (
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
                  {pendingReturns.map((returnItem) => (
                    <tr key={returnItem.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{returnItem.item}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{returnItem.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{returnItem.returnerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{returnItem.finderName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{returnItem.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button 
                          onClick={() => handleViewReturn(returnItem.reportId, returnItem.id)}
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
            <div className="text-center py-8 text-gray-500">
              There are currently no pending returns to review.
            </div>
          )}
        </div>

        
        {/* Verified and Rejected Returns Sections - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Verified Returns Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Recently Verified Returns</h2>
            
            {verifiedReturns.length > 0 ? (
              <div className="space-y-4">
                {verifiedReturns.map((returnItem) => (
                  <div key={returnItem.id} className="border-l-4 border-green-500 pl-4 py-2">
                    <h3 className="text-lg font-medium text-gray-900">{returnItem.item}</h3>
                    <p className="text-sm text-gray-500">Returner: {returnItem.returnerName}</p>
                    <p className="text-sm text-gray-500">Finder: {returnItem.finderName}</p>
                    <p className="text-sm text-gray-500">Verified on {returnItem.date}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 py-4">
                No verified returns to display.
              </div>
            )}
          </div>

          {/* Rejected Returns Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Recently Rejected Returns</h2>
            
            {rejectedReturns.length > 0 ? (
              <div className="space-y-4">
                {rejectedReturns.map((returnItem) => (
                  <div key={returnItem.id} className="border-l-4 border-red-500 pl-4 py-2">
                    <h3 className="text-lg font-medium text-gray-900">{returnItem.item}</h3>
                    <p className="text-sm text-gray-500">Returner: {returnItem.returnerName}</p>
                    <p className="text-sm text-gray-500">Finder: {returnItem.finderName}</p>
                    <p className="text-sm text-gray-500">Rejected on {returnItem.date}</p>
                    {returnItem.additionalInfo && (
                      <p className="text-sm text-gray-500 mt-1">Reason: {returnItem.additionalInfo}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 py-4">
                No rejected returns to display.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard