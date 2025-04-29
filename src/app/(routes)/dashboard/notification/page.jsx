'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Inbox } from 'lucide-react';

export default function NotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const notifRef = collection(db, 'users', user.uid, 'notifications');
        const snapshot = await getDocs(notifRef);
        const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotifications(notifs);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-6 text-white">Loading...</div>;

  return (
    <div className="p-6 text-white min-h-screen bg-[#1a202c]">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-10 text-gray-400">
          <Inbox className="w-12 h-12 mb-2" />
          <p>No notifications for now.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {notifications.map((notif) => (
            <li
              key={notif.id}
              className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700"
            >
              <p className="text-sm">{notif.message || 'No message provided.'}</p>
              {notif.timestamp && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notif.timestamp.toDate()).toLocaleString()}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
