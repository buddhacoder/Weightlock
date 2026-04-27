"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvite } from "@/lib/actions/invites";
import { signInWithEmail } from "@/lib/actions/auth";
import { Scale, Users, DollarSign, Mail } from "lucide-react";

interface AcceptInviteClientProps {
  token: string;
  participantName: string;
  targetWeightLoss: number;
  durationWeeks: number;
  totalDeposit: string;
}

export function AcceptInviteClient({
  token,
  participantName,
  targetWeightLoss,
  durationWeeks,
  totalDeposit,
}: AcceptInviteClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<"info" | "auth" | "sent">("info");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    const result = await signInWithEmail(email);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setStep("sent");
      setLoading(false);
    }
  }

  async function handleAccept() {
    setLoading(true);
    setError(null);
    const result = await acceptInvite(token);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(`/contracts/${result.contractId}`);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-6">
        <Scale className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
        <h1 className="text-2xl font-bold text-slate-900">WeightLock</h1>
        <p className="text-slate-600">Referee Invitation</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>You&apos;ve been invited!</CardTitle>
          <CardDescription>
            {participantName} wants you as their accountability referee
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Weight loss goal</span>
              <span className="font-medium">{targetWeightLoss} lb</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Duration</span>
              <span className="font-medium">{durationWeeks} weeks</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Total contract value</span>
              <span className="font-medium">{totalDeposit}</span>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-lg p-4">
            <h4 className="font-medium text-sm text-emerald-900 mb-1">As a referee, you&apos;ll:</h4>
            <ul className="text-sm text-emerald-700 space-y-1">
              <li>- Verify weigh-ins</li>
              <li>- Earn $30 for each compliant week</li>
              <li>- Earn milestone and completion bonuses</li>
            </ul>
          </div>

          {step === "info" && (
            <>
              <Button onClick={() => setStep("auth")} className="w-full" size="lg">
                Accept Invitation
              </Button>
              <p className="text-xs text-center text-slate-500">
                You&apos;ll need to sign in or create an account
              </p>
            </>
          )}

          {step === "auth" && (
            <div className="space-y-3">
              <div>
                <Label>Your Email</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button onClick={handleSignIn} disabled={loading || !email} className="w-full">
                {loading ? "Sending..." : "Send Magic Link"}
              </Button>
            </div>
          )}

          {step === "sent" && (
            <div className="text-center py-2">
              <Mail className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600 mb-3">
                Check your email for the magic link, then return here.
              </p>
              <Button onClick={handleAccept} disabled={loading} className="w-full">
                {loading ? "Accepting..." : "I've signed in — Accept Invite"}
              </Button>
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
