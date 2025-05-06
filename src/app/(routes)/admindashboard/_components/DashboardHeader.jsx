'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Bell, MessageSquare } from 'lucide-react';

function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [networkStatus, setNetworkStatus] = useState('good'); // 'good', 'slow', 'offline'
  const router = useRouter();

  useEffect(() => {
    // Check network status
    const updateNetworkStatus = () => {
      if (!navigator.onLine) {
        setNetworkStatus('offline');
      } else {
        const latency = Math.random() * 1000;
        setNetworkStatus(latency < 200 ? 'good' : latency < 500 ? 'slow' : 'offline');
      }
    };

    updateNetworkStatus();
    const interval = setInterval(updateNetworkStatus, 1000);

    // Auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setLoading(false);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [router]);

  if (loading) {
    return null;
  }

  return (
    <div className="p-5 flex justify-between items-center border shadow-sm bg-[#2c3e50] dark:bg-gray-800 dark:border-gray-700">
      {/* NWSSU Admin Panel Text */}
      <div className="text-white font-bold text-xl">NWSSU Admin Panel</div>
      
      {/* Icons Container */}
      <div className="flex items-center gap-4">
        {/* Bell Icon */}
        <button onClick={() => router.push('/dashboard/notification')} className="relative group">
          <Bell className="w-6 h-6 text-white hover:text-blue-400 transition-colors" />
        </button>

        {/* Message Icon */}
        <button onClick={() => router.push('/admindashboard/messages')} className="relative group">
          <MessageSquare className="w-6 h-6 text-white hover:text-blue-400 transition-colors" />
        </button>

        {/* WiFi Icon */}
        <div className="relative">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${
              networkStatus === 'good'
                ? 'text-green-500'
                : networkStatus === 'slow'
                ? 'text-yellow-500'
                : 'text-red-500'
            }`}
          >
            <path d="M5 12.55a11 11 0 0 1 14.08 0" opacity={networkStatus === 'offline' ? '0' : '1'} />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" opacity={networkStatus === 'good' ? '1' : '0'} />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" opacity={networkStatus !== 'offline' ? '1' : '0'} />
            <circle cx="12" cy="19" r="1" opacity={networkStatus !== 'offline' ? '1' : '0'} />
          </svg>

          {/* Tooltip */}
          <div className="absolute right-0 top-full mt-1 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 hover:opacity-100 transition-opacity">
            {networkStatus === 'good'
              ? 'Strong connection'
              : networkStatus === 'slow'
              ? 'Weak connection'
              : 'No internet connection'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;