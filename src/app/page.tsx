'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DineDeskLogo } from '@/components/icons/logo';
import { User, Shield } from 'lucide-react';

import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to super-admin dashboard
  redirect('/super-admin');
  
  // This part will never be rendered due to the redirect
  return null;
}
