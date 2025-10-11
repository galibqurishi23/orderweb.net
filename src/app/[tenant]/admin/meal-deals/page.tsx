'use client'

import { useParams } from 'next/navigation'
import MealDealsManager from '@/components/admin/MealDealsManager'

export default function AdminMealDealsPage() {
  const params = useParams()
  const tenantId = params.tenant as string

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 lg:px-8">
        <MealDealsManager tenantId={tenantId} />
      </div>
    </div>
  )
}
