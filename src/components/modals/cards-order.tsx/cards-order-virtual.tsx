import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import { postApiV1CardsVirtual } from "@/client";
import { DialogFooter } from "@/components/ui/dialog";
import { useCards } from "@/context/CardsContext";
import { toast } from "sonner";
import { CollapsedError } from "@/components/collapsedError";

interface CardsOrderVirtualProps {
  onClose: () => void;
  onGoBack: () => void;
}

export const CardsOrderVirtual = ({ onClose, onGoBack }: CardsOrderVirtualProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { refreshCards } = useCards();

  const onCardOrder = useCallback(() => {
    setIsLoading(true);

    postApiV1CardsVirtual()
      .then(({ error }) => {
        if (error) {
          console.error("Error ordering card: ", error);
          toast.error(<CollapsedError title="Erro ao pedir cartão" error={error} />);
          setIsLoading(false);
          return;
        }

        toast.success("Cartão virtual solicitado com sucesso");
        refreshCards();
        setIsLoading(false);
        onClose();
      })
      .catch((error) => {
        console.error("Error ordering card: ", error);
        toast.error(<CollapsedError title="Erro ao pedir cartão" error={error} />);
        setIsLoading(false);
      });
  }, [refreshCards, onClose]);

  return (
    <div className="space-y-4" data-testid="virtual-card-order-step">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          O cartão ficará disponível imediatamente no seu painel para compras online. Você também pode adicioná-lo
          manualmente à sua carteira móvel para compras presenciais.
        </p>
      </div>
      <DialogFooter className="justify-end">
        <Button variant="outline" onClick={onGoBack} data-testid="back-button">
          Voltar
        </Button>
        <Button disabled={isLoading} loading={isLoading} onClick={onCardOrder} data-testid="order-virtual-card-button">
          Solicitar cartão virtual
        </Button>
      </DialogFooter>
    </div>
  );
};
