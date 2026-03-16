import { notFound } from 'next/navigation'
import { ArkFormClient } from './ark-form-client'
import { prisma } from '@/lib/prisma'

// Make this page server-side rendered for fast initial load
export default async function ArkFormPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params

  const form = await prisma.arkForm.findUnique({
    where: { shortCode: shortCode.toUpperCase() },
    include: { questions: { orderBy: { order: 'asc' } } },
  }).catch(() => null)

  if (!form) return notFound()

  // Cast Prisma JsonValue to the shape the client expects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ArkFormClient form={form as any} />
}
