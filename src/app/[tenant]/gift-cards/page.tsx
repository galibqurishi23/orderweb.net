'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GiftCardsRedirect() {
    const params = useParams();
    const router = useRouter();
    const tenant = params.tenant as string;
    
    useEffect(() => {
        // Redirect to shop page
        router.replace(`/${tenant}/shop`);
    }, [tenant, router]);
    
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <p className="text-lg text-gray-600">Redirecting to shop...</p>
            </div>
        </div>
    );
}
