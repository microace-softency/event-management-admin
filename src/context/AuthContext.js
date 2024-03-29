import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, db } from '../firebase'
import { collections } from '../config';
import { collection, collectionGroup, doc, getDoc, getDocs, query, where } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(JSON.parse(localStorage.getItem('tenant')) || null);
  const [company, setCompany] = useState(JSON.parse(localStorage.getItem('company')) || null);
  const [authRole, setAuthRole ] = useState(sessionStorage.getItem('authRole') || null);
  const [ token, setToken ] = useState(sessionStorage.getItem('token') || null)

  const clearState = () => {
    localStorage.removeItem('tenant');
    localStorage.removeItem('company');
    setCompany(null);
    setTenant(null);
  }

  const getUserRefByEmail = async (email) => {
    const userRef = collection(db, myCollection(collections.USERS));
    const q = query(userRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      return doc.data();
    });
    if (!querySnapshot.empty) {
      setAuthRole(JSON.stringify(querySnapshot.docs[0].data()));
      return querySnapshot.docs[0].data();
    } else {
      return;
    }
  };
  const getAdminByEmail = async (email) => {
    console.log('email;', email);
    const userRef = collection(db, collections.ADMIN);
    const queryReference = query(userRef, where("email", "==", email));
    const fetchData = await getDocs(queryReference);
    const results = [];
    fetchData.forEach((doc) => {
      const abc = { id: doc.id, ...doc.data() };
      results.push(abc);
    });

    if (results[0]) {
      const t = results;
      setTenant(...t);
      localStorage.setItem('tenant', JSON.stringify(...t))
      return results;
    } else {
      logout()
      return false
    }
  };

  const signIn = async (data) => {
    console.log('data', data);
    try {
      const signInResult = await signInWithEmailAndPassword(auth, data.email, data.password);
      
      if (signInResult.user.accessToken) {
        const res = await getAdminByEmail(data.email);
        console.log('resssss===>', res);

        if (res === false) {
          clearState()
          throw new Error('Tenant ID not found');
        }
        return res;
      }
    } catch (error) {
      console.error('Error signing in:', error.message);
      throw error;
    }
  };

  const logout = () => {
    clearState()
    return signOut(auth)
  };
  
  useEffect(() => {
    const unsubsribe = onAuthStateChanged(auth, (currentUser) => {
      if (tenant) {
        setUser(currentUser);
        setToken(currentUser?.accessToken)
      } else {
        setUser(null);
        setToken(null)
      }
      currentUser?.accessToken ? sessionStorage.setItem('token', currentUser.accessToken) : sessionStorage.removeItem('token');
    });
    return unsubsribe;
  }, [tenant]);

  const myCollection = (cname) => {
    const tenantId = tenant?.tenant_id || 'ERR';
    const tenantsCollection = collectionGroup(db, cname);
    if (tenantsCollection) {
      return tenantsCollection;
    } else {
      console.error('Invalid tenant ID');
      return null;
    }
  };

  const value = {
    user,
    token,
    authRole,
    tenant,
    myCollection,
    company,
    signIn,
    logout,
  };

  return (
  <AuthContext.Provider value={value}>
    {children}
  </AuthContext.Provider>);
}
