'use client'

import React, { useEffect, useState } from "react"
import Image from "next/image"
import {
  LayoutGrid,
  ReceiptText,
  Search,
  UserRoundPen,
  SearchCheck,
  LogOut
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"

function SideNav() {
  const [user, setUser] = useState(null)
  const path = usePathname()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const menuList = [
    {
      id: 1,
      name: "Dashboard",
      icon: LayoutGrid,
      path: "/dashboard",
    },
    {
      id: 2,
      name: "Lost items",
      icon: Search,
      path: "/dashboard/Lostitems",
    },
    {
      id: 3,
      name: "Found items",
      icon: SearchCheck,
      path: "/dashboard/FoundItems",
    },
    {
      id: 4,
      name: "Report Found/Lost",
      icon: ReceiptText,
      path: "/dashboard/Report",
    },
    {
      id: 5,
      name: "Profile",
      icon: UserRoundPen,
      path: "/dashboard/Profile",
    },
    
  ]

  return (
    <div className="h-screen p-5 bg-[#2c3e50] shadow-lg border-r-2 border-[#2ecc71]">
      {/* Logo and App Name */}
      <div className="flex flex-row items-center">
        
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#2ecc71] to-[#27ae60] bg-clip-text text-transparent ml-2">
          Lost and Found
        </h1>
      </div>

      {/* Navigation Menu */}
      <div className="mt-8">
        {menuList.map((menu) => (
          <Link href={menu.path} key={menu.id}>
            <div
              className={`flex gap-3 items-center text-gray-300 font-medium mb-2 p-3 rounded-lg transition-colors
                hover:bg-[#34495e] hover:text-white
                ${path === menu.path ? "bg-[#34495e] text-white" : ""}`}
            >
              <menu.icon 
                size={20} 
                className={`${path === menu.path ? "text-[#2ecc71]" : "text-gray-400"}`} 
              />
              <span>{menu.name}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* User Info and Sign Out */}
      {user && (
        <div className="absolute bottom-5 left-5 right-5">
          <div className="flex items-center justify-between p-3 bg-[#34495e] rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#2ecc71] flex items-center justify-center text-white">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-300 truncate max-w-[120px]">
                {user.email}
              </span>
            </div>
            <button 
              onClick={handleSignOut}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SideNav