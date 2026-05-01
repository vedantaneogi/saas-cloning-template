import { redirect } from 'next/navigation'

// Signup not implemented for this Outlook clone — redirect to sign-in
export default function SignUpPage() {
  redirect('/sign-in')
}
