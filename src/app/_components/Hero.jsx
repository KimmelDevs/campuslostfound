'use client'

import React, { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

function Hero() {
  const [isSignedIn, setIsSignedIn] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user)
    })

    return () => unsubscribe()
  }, [])

  return (
    <section className="relative w-full h-screen min-h-[600px] flex items-center justify-center">
      {/* Full background image with overlay */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/background.jpg"
          alt="Campus background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[#2c3e50]/80 backdrop-blur-sm"></div>
      </div>

      <div className="container px-4 md:px-6 text-center">
        <div className="flex flex-col items-center space-y-8">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-white">
              Reuniting What's Lost
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-200 md:text-xl">
              Our platform helps you find lost items and return found belongings to their rightful owners.
            </p>
          </div>
          
          <div className="flex flex-col gap-4 min-[400px]:flex-row">
            {!isSignedIn ? (
              <>
                <Link href="/sign-in">
                  <Button className="px-8 h-12 text-lg bg-[#2ecc71] hover:bg-[#27ae60] text-white">
                    Report Found Item
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button 
                    variant="outline" 
                    className="px-8 h-12 text-lg border-white bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  >
                    Search Lost Item
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/dashboard">
                <Button className="px-8 h-12 text-lg bg-[#2ecc71] hover:bg-[#27ae60] text-white">
                  Go to Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero