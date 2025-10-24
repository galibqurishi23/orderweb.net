import { NextResponse } from 'next/server';

export async function GET() {
  process.stdout.write('TEST LOG LINE\n');
  console.log('TEST CONSOLE.LOG');
  console.error('TEST CONSOLE.ERROR');
  
  return NextResponse.json({ test: 'ok' });
}
