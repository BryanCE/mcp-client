import Link from "next/link"
import { Button } from "~/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center px-4 py-8">
      <section className="mx-auto max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Button asChild size="sm" className="sm:size-auto">
            <Link href="/">Go to Home</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
