"use client";

import { useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitWeighIn, uploadWeighInPhoto } from "@/lib/actions/weigh-ins";
import { Scale, Camera, ArrowLeft, X, Upload } from "lucide-react";
import Link from "next/link";

export default function WeighInPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params.id as string;

  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  function removePhoto() {
    setPhoto(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let photoPath: string | undefined;

    // Upload photo first if one was selected
    if (photo) {
      const uploadResult = await uploadWeighInPhoto(contractId, photo);
      if (uploadResult.error) {
        setError(`Photo upload failed: ${uploadResult.error}`);
        setLoading(false);
        return;
      }
      photoPath = uploadResult.path;
    }

    const result = await submitWeighIn({
      contract_id: contractId,
      weight_lbs: Number(weight),
      note: note || undefined,
      photo_path: photoPath,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => router.push(`/contracts/${contractId}`), 1500);
    }
  }

  return (
    <AppShell>
      <div className="max-w-md mx-auto">
        <Link
          href={`/contracts/${contractId}`}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contract
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
              <Scale className="h-7 w-7 text-emerald-600" />
            </div>
            <CardTitle>Log Weigh-In</CardTitle>
            <CardDescription>
              Enter your current weight. Your referee will verify it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center py-6">
                <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <Scale className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Submitted!</h3>
                <p className="text-slate-600">
                  Your weigh-in is awaiting referee verification.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Weight (lb)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="185.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    required
                    className="text-2xl text-center h-14 font-bold"
                  />
                </div>
                <div>
                  <Label>Note (optional)</Label>
                  <Textarea
                    placeholder="e.g., Morning weigh-in, before breakfast"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Scale Photo (optional)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {photoPreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200">
                      <img
                        src={photoPreview}
                        alt="Scale photo preview"
                        className="w-full h-48 object-cover"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <Camera className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">
                        Click to upload a photo of your scale
                      </p>
                      <p className="text-xs text-slate-400">
                        JPG or PNG, for referee verification
                      </p>
                    </div>
                  )}
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" size="lg" disabled={loading || !weight}>
                  {loading ? "Submitting..." : "Submit Weigh-In"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
