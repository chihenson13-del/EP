"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function VerifyEmailInner() {
  const params = useSearchParams()
  const token = params.get("token")
  const email = params.get("email")
  const [status, setStatus] = useState<"pending" | "success" | "error" | "idle">(
    token && email ? "pending" : "idle"
  )

  useEffect(() => {
    if (!token || !email) return
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email }),
    })
      .then((res) => setStatus(res.ok ? "success" : "error"))
      .catch(() => setStatus("error"))
  }, [token, email])

  if (status === "idle") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>We sent a verification link to your email address.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {status === "pending" && "Verifying..."}
          {status === "success" && "Email verified"}
          {status === "error" && "Verification failed"}
        </CardTitle>
        <CardDescription>
          {status === "pending" && "Hang tight while we confirm your email address."}
          {status === "success" && "Your email is verified. You can now log in."}
          {status === "error" && "This link is invalid or has expired."}
        </CardDescription>
      </CardHeader>
      {status !== "pending" && (
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Continue to login</Link>
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  )
}
