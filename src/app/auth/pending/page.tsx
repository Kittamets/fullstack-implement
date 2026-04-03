'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function PendingApprovalPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'pending' | 'approved' | 'not_found'>('loading')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')

  // รับ email จาก query params (กรณีมาจากหน้า register)
  const emailFromUrl = searchParams?.get('email') || ''

  useEffect(() => {
    let isMounted = true

    async function checkStatus() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        // ถ้าไม่ได้ login แต่มี email ใน URL → แสดงสถานะรออนุมัติ
        if (!user) {
          if (emailFromUrl) {
            if (isMounted) {
              setEmail(emailFromUrl)
              setStatus('pending')
            }
          } else {
            if (isMounted) setStatus('not_found')
          }
          return
        }

        if (isMounted) {
          setEmail(user.email || '')
          setFullName(user.user_metadata?.full_name || user.email?.split('@')[0] || '')
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_approved, role')
          .eq('id', user.id)
          .maybeSingle()

        // Admin/Owner อนุมัติอัตโนมัติ
        if (profile?.role === 'admin' || profile?.role === 'owner') {
          if (isMounted) setStatus('approved')
          return
        }

        // is_approved = true หรือ null (user เก่า) → อนุมัติแล้ว
        if (profile?.is_approved === true || profile?.is_approved === null) {
          if (isMounted) setStatus('approved')
        } else {
          // ถ้าไม่มี profile หรือ is_approved = false → รออนุมัติ
          if (isMounted) setStatus('pending')
        }
      } catch (error) {
        console.error('Error checking status:', error)
        // ถ้ามี email ใน URL ให้แสดงสถานะรออนุมัติ ไม่ใช่ not_found
        if (emailFromUrl && isMounted) {
          setEmail(emailFromUrl)
          setStatus('pending')
        } else if (isMounted) {
          setStatus('not_found')
        }
      }
    }

    checkStatus()

    // Poll ทุก 5 วินาที
    const interval = setInterval(checkStatus, 5000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [emailFromUrl])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const handleGoHome = () => {
    window.location.href = '/home'
  }

  // กำลังโหลด
  if (status === 'loading') {
    return (
      <main className="min-h-dvh grid place-items-center p-6 bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
          <p className="text-gray-600">กำลังตรวจสอบสถานะ...</p>
        </div>
      </main>
    )
  }

  // ได้รับการอนุมัติแล้ว
  if (status === 'approved') {
    return (
      <main className="min-h-dvh grid place-items-center p-6 bg-gray-50">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-100 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">ได้รับการอนุมัติแล้ว!</h1>
            <p className="text-sm text-gray-500 mt-1">บัญชีของคุณพร้อมใช้งานแล้ว</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <p className="text-center text-gray-600">
              คุณสามารถเข้าสู่ระบบและใช้งานได้แล้ว
            </p>
            <button
              onClick={handleGoHome}
              className="block w-full py-2.5 px-4 rounded-xl text-sm font-medium text-center text-white bg-gray-900 hover:bg-gray-800 transition-all"
            >
              ไปหน้าหลัก
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ยังไม่ได้ login
  if (status === 'not_found') {
    return (
      <main className="min-h-dvh grid place-items-center p-6 bg-gray-50">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-200 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">กรุณาเข้าสู่ระบบ</h1>
          <p className="text-sm text-gray-500 mt-1 mb-6">คุณยังไม่ได้เข้าสู่ระบบ</p>
          <Link
            href="/auth/login"
            className="inline-block py-2.5 px-6 rounded-xl text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-all"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </main>
    )
  }

  // รออนุมัติ (status === 'pending')
  return (
    <main className="min-h-dvh grid place-items-center p-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">รอการอนุมัติ</h1>
          <p className="text-sm text-gray-500 mt-1">บัญชีของคุณอยู่ระหว่างการตรวจสอบ</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">บัญชีกำลังรอการอนุมัติ</p>
              <p className="text-amber-700/80">
                แอดมินจะตรวจสอบและอนุมัติบัญชีของคุณในเร็วๆ นี้
                หน้านี้จะอัปเดตอัตโนมัติเมื่อได้รับการอนุมัติ
              </p>
            </div>
          </div>

          {email && (
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-900">Email: </span>
                {email}
              </p>
              <p>
                <span className="font-medium text-gray-900">สถานะ: </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  รออนุมัติ
                </span>
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
