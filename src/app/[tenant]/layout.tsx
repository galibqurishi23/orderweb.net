'use client';

import { ReactNode } from 'react';

export default function TenantLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div>{children}</div>;
}
