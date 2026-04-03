import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Scale,
  Shield,
  TrendingDown,
  Users,
  CheckCircle,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-emerald-600" />
            <span className="text-xl font-bold text-slate-900">WeightLock</span>
          </div>
          <Link href="/login">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <DollarSign className="h-4 w-4" />
          Behavioral commitment contracts
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
          Put money behind
          <br />
          <span className="text-emerald-600">your goals</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Lock funds into a weight loss contract. Hit your targets and your
          referee earns rewards. Skip weigh-ins and money moves automatically.
          Real stakes. Real accountability.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto text-base px-8">
              Get Started
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8">
              How It Works
            </Button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: DollarSign,
              title: "Deposit funds",
              description:
                "Lock $1,000 (or your chosen amount) into your contract. Funds are allocated across weekly rewards, milestones, penalties, and a completion bonus.",
            },
            {
              icon: Users,
              title: "Invite a referee",
              description:
                "Your referee verifies your weigh-ins and earns money when you stay consistent. They have skin in the game too.",
            },
            {
              icon: TrendingDown,
              title: "Hit your targets",
              description:
                "Weigh in 3x per week. Meet milestones every 5 lbs. Complete your goal and unlock the full completion bonus for your referee.",
            },
          ].map((step, i) => (
            <div key={i} className="bg-white rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
                <step.icon className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-slate-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Built for accountability
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Funds locked securely", desc: "Your deposit is managed through platform-controlled flows with a full audit trail." },
              { icon: CheckCircle, title: "Referee verification", desc: "Every weigh-in requires referee approval. No gaming the system." },
              { icon: Scale, title: "Weekly compliance", desc: "$30 released for each compliant week. $5 penalty for each missed week." },
              { icon: TrendingDown, title: "Milestone rewards", desc: "$25 for every 5 lbs lost, plus bonus at 10 lb intervals." },
              { icon: DollarSign, title: "Completion bonus", desc: "$240 released when you hit your full weight loss target." },
              { icon: Users, title: "Dual incentives", desc: "Both you and your referee benefit from your consistency." },
            ].map((f, i) => (
              <div key={i} className="flex gap-4 bg-white rounded-lg border p-5">
                <f.icon className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-medium text-slate-900">{f.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to commit?</h2>
        <p className="text-lg text-slate-600 mb-8">Start your weight loss contract today. Real money. Real results.</p>
        <Link href="/login">
          <Button size="lg" className="text-base px-8">Create Your Contract</Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm text-slate-500">
          <p>WeightLock — Behavioral commitment contracts for weight loss.</p>
          <p className="mt-2">
            Funds are managed through platform-controlled payment flows, not regulated escrow. See terms for details.
          </p>
        </div>
      </footer>
    </div>
  );
}
