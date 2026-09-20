import { PageHeader } from "@/components/ui/primitives";
import { RequestsClient } from "@/components/verification/requests-client";
import { pageUser } from "@/lib/auth/page";
import { listHolderRequests } from "@/lib/services/verification";

export const metadata = { title: "Requests" };

export default async function RequestsPage() {
  const { s, user } = await pageUser();
  const requests = await listHolderRequests(s, user.id);
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Verification requests"
        title="Who wants to know"
        description="Platforms ask. You decide. Approved requests receive a yes-or-no proof — never your data."
      />
      <RequestsClient requests={requests} />
    </div>
  );
}
