import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface SafeOwnersSuccessDeletionProps {
  onBack: () => void;
}

export const SafeOwnersSuccessDeletion = ({ onBack }: SafeOwnersSuccessDeletionProps) => {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <CheckCircle2 className="w-16 h-16 text-success" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Proprietário removido</h3>
        <p className="text-sm text-muted-foreground">
          A transação foi enfileirada com sucesso. O proprietário será removido em 3 minutos.
        </p>
      </div>

      <Button className="w-full bg-button-bg hover:bg-button-bg-hover text-button-black font-medium" onClick={onBack}>
        Voltar para proprietários
      </Button>
    </div>
  );
};
