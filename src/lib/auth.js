import { auth, db } from './firebase'; // Make sure db is imported
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Add Firestore functions

export const signUp = async (email, password, displayName, role = 'user') => {
  try {
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update user profile with display name
    await updateProfile(userCredential.user, {
      displayName: displayName
    });

    // Create user document in Firestore with role
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: email,
      displayName: displayName,
      role: role,
      createdAt: new Date()
    });

    return userCredential;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Get user document from Firestore to check role
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    // Return both auth user and additional user data
    return {
      authUser: userCredential.user,
      userData: userDoc.data()
    };
  } catch (error) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Get user document from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      callback({
        authUser: user,
        userData: userDoc.exists() ? userDoc.data() : null
      });
    } else {
      callback(null);
    }
  });
};

// Helper function for user-friendly error messages
const getAuthErrorMessage = (code) => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Email already in use';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters';
    case 'auth/user-not-found':
      return 'User not found';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled';
    default:
      return 'Something went wrong. Please try again';
  }
};

export { updateProfile };