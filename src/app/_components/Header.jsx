'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true); // Add loading state
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setLoading(false);
      
      // If user is logged in, redirect to dashboard
      if (user) {
        router.push('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [router]); // Add router to dependency array

  const handleRedirect = () => {
    router.push('/sign-in');
  };

  // Don't render anything while checking auth state
  if (loading) {
    return null;
  }

  return (
    <div className="p-5 flex justify-between items-center border shadow-sm">
      <div className="flex flex-row items-center gap-2">
        <Image 
          src="/logo.png" 
          alt="logo" 
          width={40} 
          height={40} 
          className="object-contain" 
        />
        <span className="text-green-800 font-bold text-xl">Lost and Found</span>
      </div>

      {!isLoggedIn && (
        <div className="flex gap-3 items-center">
          <Button variant="outline" className="rounded-full" onClick={handleRedirect}>
            Dashboard
          </Button>
          <Button className="rounded-full" onClick={handleRedirect}>
            Get Started
          </Button>
        </div>
      )}
    </div>
  );
}

export default Header;