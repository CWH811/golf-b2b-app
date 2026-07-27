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

  const handleAuth = async () => {
    if (isSigningUp) {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { emailRedirectTo: `${window.location.origin}/` } 
      });
      if (error) alert(error.message);
      else alert("Check your email for the confirmation link!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
      } else {
        // Force a hard navigation to the home page
        window.location.href = "/";
      }
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#161719]">
      <Card className="w-full max-w-sm bg-white/95 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-2xl font-extrabold text-center uppercase tracking-widest">
            {isSigningUp ? "Create Account" : "GCORE Login"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
          <Button onClick={handleAuth} className="w-full bg-[#39FF14] text-black font-bold uppercase hover:bg-[#32e012]">
            {isSigningUp ? "Sign Up" : "Sign In"}
          </Button>
          <p className="text-center text-sm cursor-pointer underline" onClick={() => setIsSigningUp(!isSigningUp)}>
            {isSigningUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}