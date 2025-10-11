import TenantLicenseManagement from '@/components/tenant/TenantLicenseManagement';

interface PageProps {
  params: {
    tenant: string;
  };
}

export default function TenantLicenseManagementPage({ params }: PageProps) {
  return (
    <div className="container mx-auto py-6">
      <TenantLicenseManagement tenantSlug={params.tenant} />
    </div>
  );
}
