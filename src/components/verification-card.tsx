"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { verifyWeighIn, getWeighInPhotoUrl } from "@/lib/actions/weigh-ins";
import type { WeighIn } from "@/types/database";
import { Check, X, Scale, User, ImageIcon } from "lucide-react";

interface VerificationCardProps {
  weighIn: WeighIn & { participant_name?: string; participant_email?: string; start_weight?: number };
  participantName: string;
}

export function VerificationCard({ weighIn, participantName }: VerificationCardProps) {
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<"approved" | "rejected" | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (weighIn.photo_path) {
      getWeighInPhotoUrl(weighIn.photo_path).then((res) => {
        if (res.url) setPhotoUrl(res.url);
      });
    }
  }, [weighIn.photo_path]);

  async function handleVerify(status: "approved" | "rejected") {
    setLoading(true);
    const res = await verifyWeighIn({
      weigh_in_id: weighIn.id,
      status,
      rejection_reason: status === "rejected" ? rejectionReason : undefined,
    });
    setLoading(false);
    if (!res.error) {
      setDone(true);
      setResult(status);
    }
  }

  if (done) {
    return (
      <Card className={result === "approved" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
        <CardContent className="py-4 text-center">
          <Badge variant={result === "approved" ? "success" : "destructive"}>
            {result === "approved" ? "Approved" : "Rejected"}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{participantName}</p>
              <p className="text-xs text-slate-500">
                {new Date(weighIn.submitted_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-slate-900">{weighIn.weight_lbs} lb</p>
            <Badge variant="warning">Pending</Badge>
          </div>
        </div>

        {weighIn.note && (
          <p className="text-sm text-slate-600 bg-slate-50 rounded p-2">{weighIn.note}</p>
        )}

        {weighIn.photo_path && (
          <div className="rounded-lg overflow-hidden border border-slate-200">
            {photoUrl ? (
              <a href={photoUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={photoUrl}
                  alt="Scale photo"
                  className="w-full h-40 object-cover hover:opacity-90 transition-opacity"
                />
              </a>
            ) : (
              <div className="w-full h-40 bg-slate-50 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-slate-300 animate-pulse" />
              </div>
            )}
          </div>
        )}

        {showReject ? (
          <div className="space-y-2">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowReject(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleVerify("rejected")}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "..." : "Confirm Reject"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="success"
              onClick={() => handleVerify("approved")}
              disabled={loading}
              className="flex-1 gap-2"
            >
              <Check className="h-4 w-4" />
              {loading ? "..." : "Approve"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowReject(true)}
              disabled={loading}
              className="flex-1 gap-2"
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
