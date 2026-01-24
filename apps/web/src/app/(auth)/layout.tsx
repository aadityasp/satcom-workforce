/**
 * Auth Layout
 *
 * Shared layout for authentication pages (login, forgot password, reset password).
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 to-navy-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {children}
      </div>
    </div>
  );
}
