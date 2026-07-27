"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    setIsLoading(true);
    if (isSigningUp) {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { emailRedirectTo: `${window.location.origin}/` } 
      });
      if (error) alert(error.message);
      else alert("Check your email for the confirmation link!");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
      } else if (data.session) {
        window.location.href = "/";
      }
    }
    setIsLoading(false);
  };

  // Reusing your custom procedural concrete texture
  const emulatedConcreteStyle = {
    backgroundColor: "#161719", 
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E")`,
  };

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative font-sans" style={emulatedConcreteStyle}>
      
      {/* Branded Header Area */}
      <div className="w-full max-w-sm flex flex-col items-center mb-10 relative z-10">
        <div 
          className="relative w-full max-w-[280px] aspect-video overflow-hidden mb-2"
          style={{ 
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 70%)', 
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 70%)' 
          }}
        >
           <img src="/logo.jpg" alt="GCore Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#007BFF] to-[#39FF14] tracking-widest uppercase drop-shadow-md">
          GCORE
        </h1>
        <p className="text-gray-400 text-[10px] font-bold tracking-widest uppercase mt-2 text-center">
          Golf Course Operations Resource Engine
        </p>
      </div>

      {/* Dark Glassmorphic Login Card */}
      <Card className="w-full max-w-sm bg-[#000000]/80 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative z-10">
        <CardHeader>
          <CardTitle className="text-xl font-extrabold text-center uppercase tracking-widest text-white">
            {isSigningUp ? "Create Account" : "Access Portal"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Input 
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)} 
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-[#39FF14] h-12"
          />
          <Input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)} 
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-[#39FF14] h-12"
          />
          <Button 
            onClick={handleAuth} 
            disabled={isLoading}
            className="w-full h-12 bg-[#39FF14] text-black font-extrabold uppercase tracking-widest hover:bg-[#32e012] shadow-[0_0_15px_rgba(57,255,20,0.2)] transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-black" /> : (isSigningUp ? "Sign Up" : "Secure Login")}
          </Button>
          <p 
            className="text-center text-xs font-bold cursor-pointer text-gray-500 hover:text-white transition-colors uppercase tracking-wider mt-4" 
            onClick={() => setIsSigningUp(!isSigningUp)}
          >
            {isSigningUp ? "Already have an account? Sign In" : "Authorized Users Only: Sign Up"}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}