import { NextRequest, NextResponse } from 'next/server'
import { getMealDealById, updateMealDeal, deleteMealDeal } from '@/lib/meal-deals-service'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenant: string; id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { tenant: tenantId, id: mealDealId } = resolvedParams;
    const mealDeal = await getMealDealById(tenantId, mealDealId)
    
    if (!mealDeal) {
      return NextResponse.json(
        { error: 'Meal deal not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(mealDeal)
  } catch (error) {
    console.error('Error fetching meal deal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meal deal' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ tenant: string; id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { tenant: tenantId, id: mealDealId } = resolvedParams;
    const body = await request.json()
    
    // Add the ID to the body for the update function
    const updateData = { ...body, id: mealDealId }
    
    const updatedMealDeal = await updateMealDeal(tenantId, updateData)
    return NextResponse.json(updatedMealDeal)
  } catch (error) {
    console.error('Error updating meal deal:', error)
    return NextResponse.json(
      { error: 'Failed to update meal deal' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tenant: string; id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { tenant: tenantId, id: mealDealId } = resolvedParams;
    
    await deleteMealDeal(tenantId, mealDealId)
    return NextResponse.json({ message: 'Meal deal deleted successfully' })
  } catch (error) {
    console.error('Error deleting meal deal:', error)
    return NextResponse.json(
      { error: 'Failed to delete meal deal' },
      { status: 500 }
    )
  }
}
