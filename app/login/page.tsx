"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (isSigningUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: `${window.location.origin}/` } 
        });
        if (error) {
          alert(error.message);
        } else {
          alert("Check your email for the confirmation link!");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          alert(error.message);
        } else {
          window.location.href = "/";
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const emulatedConcreteStyle = {
    backgroundColor: "#161719",
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E")`,
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={emulatedConcreteStyle}
    >
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#39FF14]/5 rounded-full blur-3xl pointer-events-none" />
      
      <Card className="w-full max-w-sm bg-[#1b1d20]/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#39FF14]">GCore</p>
              <CardTitle className="text-2xl font-extrabold text-center uppercase tracking-widest text-white mt-1">
                {isSigningUp ? "Create Account" : "Sign In"}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Email</label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-white/10 bg-[#161719] text-white placeholder:text-slate-500 focus:border-[#39FF14]/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-white/10 bg-[#161719] text-white placeholder:text-slate-500 focus:border-[#39FF14]/40"
            />
          </div>
          <Button
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-[#39FF14] text-black font-bold uppercase tracking-widest hover:bg-[#32e012] shadow-[0_0_15px_rgba(57,255,20,0.2)] transition-all h-10 disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                {isSigningUp ? "Creating…" : "Signing In…"}
              </span>
            ) : (
              isSigningUp ? "Sign Up" : "Sign In"
            )}
          </Button>
          <p
            className="text-center text-sm cursor-pointer text-slate-400 hover:text-[#39FF14] transition"
            onClick={() => setIsSigningUp(!isSigningUp)}
          >
            {isSigningUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}