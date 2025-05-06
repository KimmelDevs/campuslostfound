'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Inbox, Bell, BellOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotificationPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        await fetchNotifications(user.uid);
        
        // Mark notifications as read when page loads
        await markNotificationsAsRead(user.uid);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchNotifications = async (uid) => {
    try {
      const notifRef = collection(db, 'users', uid, 'notifications');
      const q = query(notifRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const notifs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        // Convert Firestore timestamp to JS Date object
        timestamp: doc.data().createdAt?.toDate() 
      }));
      
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationsAsRead = async (uid) => {
    try {
      // Get all unread notifications
      const unreadNotifs = notifications.filter(n => !n.read);
      
      if (unreadNotifs.length > 0) {
        // Update each unread notification
        const batch = [];
        unreadNotifs.forEach(notif => {
          const notifRef = doc(db, 'users', uid, 'notifications', notif.id);
          batch.push(updateDoc(notifRef, { read: true }));
        });
        
        await Promise.all(batch);
        
        // Update global unread count in user document
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
          unreadNotifications: 0
        });
        
        // Refresh notifications
        await fetchNotifications(uid);
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read when clicked
    if (!notification.read && userId) {
      const notifRef = doc(db, 'users', userId, 'notifications', notification.id);
      await updateDoc(notifRef, { read: true });
      await fetchNotifications(userId);
    }
    
    // Navigate to chat page with chatId if available
    if (notification.chatId) {
      router.push(`/dashboard/messages/chat?id=${notification.chatId}`);
    }
    // Fallback to item page if no chatId but itemId exists
    else if (notification.itemId) {
      router.push(`/dashboard/item?id=${notification.itemId}`);
    }
  };

  if (loading) return (
    <div className="p-6 min-h-screen bg-white">
      <div className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 min-h-screen bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl text-black font-bold">Notifications</h1>
        <div className="flex items-center text-gray-500">
          {unreadCount > 0 ? (
            <Bell className="w-5 h-5 text-blue-500" />
          ) : (
            <BellOff className="w-5 h-5" />
          )}
          <span className="ml-1 text-sm">{unreadCount} unread</span>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-gray-400">
          <Inbox className="w-12 h-12 mb-2" />
          <p>No notifications yet.</p>
          <Link href="/dashboard" className="mt-4 text-blue-500 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notif) => (
            <li
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-lg cursor-pointer transition-colors ${
                !notif.read 
                  ? 'bg-blue-50 border-l-4 border-blue-500' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <p className={`text-sm ${!notif.read ? 'font-semibold text-black' : 'text-gray-700'}`}>
                  {notif.message || 'No message provided.'}
                </p>
                {!notif.read && (
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 ml-2"></span>
                )}
              </div>
              {notif.timestamp && (
                <p className="text-xs text-gray-500 mt-1">
                  {notif.timestamp.toLocaleString()}
                </p>
              )}
              {notif.type === 'claim' && (
                <span className="inline-block mt-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                  Claim
                </span>
              )}
              {notif.type === 'return' && (
                <span className="inline-block mt-1 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                  Return
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}