'use client'

import React, { useEffect, useState } from "react"
import Image from "next/image"
import {
  LayoutGrid,
  ReceiptText,
  Search,
  UserRoundPen,
  SearchCheck,
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
    <div className="h-screen p-5 border shadow-sm">
      <div className="flex flex-row items-center">
        <Image src={'/logo.png'} alt='logo' width={40} height={40} className="object-contain" />
        <span className='text-green-800 font-bold text-xl ml-2'>Lost and Found</span>
      </div>

      <div className="mt-5">
        {menuList.map((menu) => (
          <Link href={menu.path} key={menu.id}>
            <h2
              className={`flex gap-2 items-center text-gray-500 font-medium mb-2 p-4 cursor-pointer rounded-full
              hover:text-primary hover:bg-blue-100
              ${path === menu.path ? "text-primary bg-blue-100" : ""}`}
            >
              <menu.icon size={18} />
              {menu.name}
            </h2>
          </Link>
        ))}
      </div>

    </div>
  )
}

export default SideNav
