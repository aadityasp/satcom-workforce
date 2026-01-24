/**
 * Home Page - Redirects to login or dashboard
 */

import { redirect } from 'next/navigation';

export default function HomePage() {
  // In a real app, check auth state and redirect accordingly
  redirect('/login');
}
