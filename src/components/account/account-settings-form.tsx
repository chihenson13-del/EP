"use client"

import { useState } from "react"
import { toast } from "sonner"
import { updateProfile, changePassword, updateBrandLogo } from "@/actions/account"
import { ImageUpload } from "@/components/shared/image-upload"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { User } from "@prisma/client"

import { safe } from "@/lib/safe-action"
export function AccountSettingsForm({ user, hasCoBranding }: { user: User; hasCoBranding: boolean }) {
  const [name, setName] = useState(user.name ?? "")
  const [businessName, setBusinessName] = useState(user.businessName ?? "")
  const [brandColor, setBrandColor] = useState(user.brandColor ?? "#c8531f")
  const [logoUrl, setLogoUrl] = useState(user.brandLogoUrl ?? "")
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  async function saveProfile() {
    setSavingProfile(true)
    const result = await safe(updateProfile({ name, businessName, brandColor }))
    setSavingProfile(false)
    if (!result.ok) {
        toast.error(result.error)
        return
      }
    toast.success("Profile updated.")
  }

  async function handleLogoUpload(dataUrl: string) {
    setLogoUrl(dataUrl)
    const result = await safe(updateBrandLogo(dataUrl))
    if (!result.ok) toast.error(result.error)
    else toast.success("Logo updated.")
  }

  async function savePassword() {
    if (!currentPassword || !newPassword) {
        toast.error("Fill in both password fields.")
        return
      }
    setSavingPassword(true)
    const result = await safe(changePassword({ currentPassword, newPassword }))
    setSavingPassword(false)
    if (!result.ok) {
        toast.error(result.error)
        return
      }
    toast.success("Password updated.")
    setCurrentPassword("")
    setNewPassword("")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>{user.email} {user.emailVerified ? <Badge variant="outline" className="ml-2">Verified</Badge> : <Badge variant="secondary" className="ml-2">Unverified</Badge>}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <Button onClick={saveProfile} disabled={savingProfile} size="sm">{savingProfile ? "Saving..." : "Save profile"}</Button>
        </CardContent>
      </Card>

      {user.passwordHash && (
        <Card>
          <CardHeader><CardTitle>Password</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5"><Label>Current password</Label><Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>New password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
            <Button onClick={savePassword} disabled={savingPassword} size="sm">{savingPassword ? "Saving..." : "Change password"}</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Co-branding {!hasCoBranding && <span className="text-xs text-muted-foreground font-normal">(Pro / Unlimited)</span>}</CardTitle>
          <CardDescription>Applied to event pages on eligible plans.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>Business name</Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} disabled={!hasCoBranding} /></div>
          <div className="space-y-1.5">
            <Label>Brand color</Label>
            <Input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-9 w-24 p-1" disabled={!hasCoBranding} />
          </div>
          <div className="space-y-1.5">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoUrl && <img src={logoUrl} alt="Brand logo" className="size-12 rounded object-contain border" />}
              {hasCoBranding && <ImageUpload onUploaded={handleLogoUpload} label="Upload logo" />}
            </div>
          </div>
          {hasCoBranding && <Button onClick={saveProfile} disabled={savingProfile} size="sm">Save branding</Button>}
        </CardContent>
      </Card>
    </div>
  )
}
