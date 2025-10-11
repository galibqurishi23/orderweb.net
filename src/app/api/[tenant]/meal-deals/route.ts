import { NextRequest, NextResponse } from 'next/server'
import { getMealDeals, createMealDeal, updateMealDeal, deleteMealDeal } from '@/lib/meal-deals-service'

export async function GET(
  request: Request,
  context: { params: Promise<{ tenant: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { tenant } = resolvedParams;
    const mealDeals = await getMealDeals(tenant)
    return NextResponse.json(mealDeals)
  } catch (error) {
    console.error('Error fetching meal deals:', error)
    return NextResponse.json({ error: 'Failed to fetch meal deals' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ tenant: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { tenant } = resolvedParams;
    const body = await request.json()
    
    const mealDeal = await createMealDeal(tenant, body)
    return NextResponse.json(mealDeal, { status: 201 })
  } catch (error) {
    console.error('Error creating meal deal:', error)
    return NextResponse.json({ error: 'Failed to create meal deal' }, { status: 500 })
  }
}
