import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireGuest } from "@/lib/page-guards";
import { GuestPageHeader } from "@/components/guest/guest-page-header";
import { UploadForm } from "@/components/guest/upload-form";
import { getDict } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireGuest(slug);

  const event = await prisma.event.findFirst({
    where: { slug },
    select: { name: true, allowVideos: true, tags: { orderBy: { sortOrder: "asc" } } },
  });
  if (!event) redirect(`/e/${slug}`);

  const t = await getDict();

  return (
    <main className="flex flex-1 flex-col">
      <GuestPageHeader backHref={`/e/${slug}/feed`} title={t.upload.title} />

      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <UploadForm
          slug={slug}
          allowVideos={event.allowVideos}
          tags={event.tags.map((t) => ({ id: t.id, label: t.label, color: t.color }))}
        />
      </div>
    </main>
  );
}
