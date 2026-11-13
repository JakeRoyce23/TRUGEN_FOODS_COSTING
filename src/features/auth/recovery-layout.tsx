import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Brand } from "../../components/brand";
import { Card, CardContent } from "../../components/ui/card";

export function RecoveryLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="min-h-screen bg-trugen-canvas px-4 py-8 sm:grid sm:place-items-center">
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 flex justify-center"><Brand /></div>
      <Card className="overflow-hidden shadow-lg">
        <div className="bg-trugen-green px-6 py-7 text-white"><h1 className="font-display text-3xl font-bold">{title}</h1><p className="mt-2 text-sm leading-6 text-white/80">{description}</p></div>
        <CardContent className="space-y-5 p-6">{children}<Link to="/login" className="flex min-h-11 items-center justify-center rounded-lg font-semibold text-trugen-green underline underline-offset-4">Back to login</Link></CardContent>
      </Card>
    </div>
  </main>;
}
