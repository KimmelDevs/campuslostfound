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
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setLoading(false);
      
      if (user) {
        router.push('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleRedirect = () => {
    router.push('/sign-in');
  };

  if (loading) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-between items-center bg-[#2c3e50] shadow-lg border-b-2 border-[#2ecc71]">
      <div className="flex items-center gap-3">
        <Image 
          src="/logo.png" 
          alt="logo" 
          width={40} 
          height={40} 
          className="object-contain"
        />
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#2ecc71] to-[#27ae60] bg-clip-text text-transparent">
          Campus Lost and Found
        </h1>
      </div>

      {!isLoggedIn && (
        <div className="flex gap-3 items-center">
          <Button 
            variant="outline" 
            className="rounded-full border-white bg-white/10 text-white hover:bg-white/20 hover:text-white transition-colors"
            onClick={handleRedirect}
          >
            Dashboard
          </Button>
          <Button 
            className="rounded-full bg-[#2ecc71] hover:bg-[#27ae60] text-white transition-colors"
            onClick={handleRedirect}
          >
            Get Started
          </Button>
        </div>
      )}
    </header>
  );
}

export default Header;