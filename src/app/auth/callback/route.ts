import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data.user) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
    }

    try {
      // เช็คว่าเป็น user ใหม่หรือ login ปกติ
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_approved, role, full_name')
        .eq('id', data.user.id)
        .maybeSingle()

      // ถ้ามี error ที่ไม่ใช่ "ไม่พบข้อมูล" ให้ log ไว้
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError)
      }

      const fullName = data.user.user_metadata?.full_name ||
                       data.user.user_metadata?.name ||
                       profile?.full_name ||
                       data.user.email?.split('@')[0] ||
                       'New User'

      // ถ้าไม่มี profile หรือ is_approved ยังไม่ถูกตั้งค่า (user ใหม่)
      const isNewUser = !profile || profile.is_approved === null || profile.is_approved === undefined

      if (isNewUser) {
        // ตั้งค่า is_approved = false สำหรับ user ใหม่
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            is_approved: false,
            full_name: fullName,
            role: 'user'
          }, { onConflict: 'id' })

        if (upsertError) {
          console.error('Profile upsert error:', upsertError)
        }

        // ตรวจสอบว่ามี employee record อยู่แล้วหรือไม่
        const { data: existingEmployee } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', data.user.id)
          .maybeSingle()

        // สร้าง employee record สำหรับรออนุมัติ (ถ้ายังไม่มี)
        if (!existingEmployee) {
          const { error: empError } = await supabase
            .from('employees')
            .insert([{
              name: fullName,
              user_id: data.user.id,
              is_active: false,
              department_id: null,
            }])

          if (empError) {
            console.error('Employee creation error:', empError)
          }
        }

        // Redirect ไปหน้ารออนุมัติพร้อม email
        return NextResponse.redirect(`${origin}/auth/pending?email=${encodeURIComponent(data.user.email || '')}`)
      }

      // ถ้ายังไม่ได้รับการอนุมัติ และไม่ใช่ admin/owner
      if (!profile.is_approved && profile.role !== 'admin' && profile.role !== 'owner') {
        return NextResponse.redirect(`${origin}/auth/pending?email=${encodeURIComponent(data.user.email || '')}`)
      }

      // ผ่านการอนุมัติแล้ว หรือเป็น admin/owner
      return NextResponse.redirect(`${origin}/home`)
    } catch (err) {
      console.error('Callback processing error:', err)
      return NextResponse.redirect(`${origin}/auth/login?error=server_error`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`)
}
