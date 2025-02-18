import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-white">
      <main className="text-center">
        <h1 className="text-4xl font-bold mb-6">Welcome to Governor</h1>
        <p className="text-xl mb-8">Create your On-chain governance with a few clicks</p>
        <Button asChild>
          <Link href="/create">Start Creating</Link>
        </Button>
      </main>
    </div>
  )
}

