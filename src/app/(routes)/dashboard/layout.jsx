'use client'
import React, { useEffect, useState } from "react"
import SideNav from "./_components/SideNav"
import DashboardHeader from "./_components/DashboardHeader"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
      } else {
        router.replace("/sign-in") // Redirect to sign-in if not logged in
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <div>
      <div className="fixed md:w-64 hidden md:block">
        <SideNav />
      </div>
      <div className="md:ml-64">
      <DashboardHeader/>
        {children}
      </div>
    </div>
  )
}

export default DashboardLayout