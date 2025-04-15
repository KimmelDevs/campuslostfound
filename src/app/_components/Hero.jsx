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
    <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-6 text-center">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Reuniting What's Lost
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              Our platform helps you find lost items and return found belongings to their rightful owners.
            </p>
          </div>
          <div className="flex flex-col gap-4 min-[400px]:flex-row">
            {!isSignedIn ? (
              <>
                <Link href="/sign-in">
                  <Button className="px-8">Report Found Item</Button>
                </Link>
                <Link href="/sign-in">
                  <Button variant="outline" className="px-8">
                    Search Lost Item
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/dashboard">
                <Button className="px-8">Go to Dashboard</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <Image
          src="/background4.jpg"
          alt="Background"
          fill
          className="object-cover opacity-10"
          priority
        />
      </div>
    </section>
  )
}

export default Hero
