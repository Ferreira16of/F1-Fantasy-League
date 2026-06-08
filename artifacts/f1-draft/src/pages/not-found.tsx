import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-8xl font-black italic tracking-tighter text-primary">404</div>
        <div>
          <h1 className="text-2xl font-bold uppercase italic tracking-tight">Página não encontrada</h1>
          <p className="mt-2 text-muted-foreground">Essa página não existe ou você não tem acesso a ela.</p>
        </div>
        <Link href="/">
          <Button className="uppercase font-bold italic tracking-wider px-8 h-12">
            <Flag className="h-4 w-4 mr-2" /> Voltar ao início
          </Button>
        </Link>
      </div>
    </div>
  );
}
