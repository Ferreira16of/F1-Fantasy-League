import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Flag, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const registerSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  handle: z.string().min(3, "O @handle deve ter pelo menos 3 caracteres").regex(/^[a-zA-Z0-9_]+$/, "Apenas letras, números e _"),
  displayName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
});

export default function Register() {
  const { login } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", handle: "", displayName: "" },
  });

  const registerMutation = useRegister();

  const onSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(
      { data },
      {
        onSuccess: (response) => {
          login(response.token, response.user);
          toast({
            title: "Conta criada!",
            description: "Bem-vindo ao F1 Draft League.",
          });
        },
        onError: (err: any) => {
          toast({
            title: "Erro ao criar conta",
            description: err?.message || "Verifique os dados e tente novamente.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/">
            <div className="inline-flex items-center justify-center gap-2 text-primary font-black text-3xl tracking-tighter italic cursor-pointer">
              <Flag className="h-8 w-8" />
              F1 DRAFT
            </div>
          </Link>
          <h2 className="mt-6 text-3xl font-bold">Criar Equipe</h2>
          <p className="mt-2 text-muted-foreground">Registre-se e comece a escalar</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de Exibição</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da Equipe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="handle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>@handle</FormLabel>
                    <FormControl>
                      <Input placeholder="seunome" {...field} />
                    </FormControl>
                    <FormDescription>Identificador único no jogo</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full uppercase font-bold italic tracking-wider h-12 mt-4" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar Conta"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Já tem uma conta? </span>
            <Link href="/login" className="text-primary hover:underline font-bold">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
