import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ConnectExtensionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectExtensionModal({ open, onOpenChange }: ConnectExtensionModalProps) {
  const { renewToken, isAuthenticating } = useAuth();
  const [error, setError] = useState<string>("");

  const handleConnect = useCallback(async () => {
    setError("");
    try {
      const token = await renewToken();
      if (token) {
        onOpenChange(false);
      } else {
        setError("Não foi possível iniciar a conexão. Verifique a extensão e a API.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [renewToken, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar carteira</DialogTitle>
          <DialogDescription>Use a extensão Cripto Signer para autenticar com segurança.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <button
            onClick={handleConnect}
            className="flex items-center gap-3 w-full border rounded-lg p-4 hover:bg-accent transition-colors"
            disabled={isAuthenticating}
            aria-label="Conectar com extensão"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-medium">Cripto Signer (Extensão)</span>
              <span className="text-xs text-muted-foreground">
                Clique para abrir a extensão e concluir a conexão
              </span>
            </div>
          </button>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <div className="text-xs text-muted-foreground">Requisitos: extensão instalada, desbloqueada e ativada para este site.</div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAuthenticating}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
