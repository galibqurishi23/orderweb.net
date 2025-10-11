'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

export default function AdminLoginRedirect() {
  const router = useRouter();
  const params = useParams();
  const tenant = params.tenant as string;

  useEffect(() => {
    // Redirect to the main admin page which is the login page
    router.replace(`/${tenant}/admin`);
  }, [router, tenant]);

  return (
    <div className="flex h-screen bg-background items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Redirecting to admin login...</p>
      </div>
    </div>
  );
}
