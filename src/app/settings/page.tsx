"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { updateProfile, getProfile } from "@/lib/actions/auth";
import { getStripeConnectStatus } from "@/lib/actions/stripe-connect";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    hasAccount: boolean;
    onboardingComplete: boolean;
  }>({ hasAccount: false, onboardingComplete: false });
  const searchParams = useSearchParams();

  const stripeParam = searchParams.get("stripe");

  useEffect(() => {
    getProfile().then((p) => {
      if (p?.full_name) setName(p.full_name);
    });
    getStripeConnectStatus().then((status) => {
      if (status) setStripeStatus(status);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.set("full_name", name);
    await updateProfile(formData);
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AppShell activeRoute="/settings">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your display name</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : saved ? "Saved!" : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payouts</CardTitle>
                <CardDescription>
                  Receive referee earnings via Stripe
                </CardDescription>
              </div>
              {stripeStatus.onboardingComplete && (
                <Badge variant="success">Payouts active</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {stripeParam === "complete" && !stripeStatus.onboardingComplete && (
              <p className="text-sm text-amber-600 mb-4">
                Stripe is still verifying your account. This usually takes a few
                minutes. Refresh this page to check again.
              </p>
            )}

            {stripeStatus.onboardingComplete ? (
              <p className="text-sm text-slate-600">
                Your Stripe Connect account is set up and active. Earned referee
                payouts will be transferred to your account automatically.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Set up a Stripe Connect account to receive payouts when you
                  serve as a referee. Earned amounts stay pending until your
                  account is ready.
                </p>
                <Button asChild>
                  <a href="/api/stripe/connect-onboarding">Set up payouts</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
