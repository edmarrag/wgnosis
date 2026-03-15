import { CreditCard, Smartphone, ChevronRight, Link } from "lucide-react";
import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface CardsOrderSelectionProps {
  onVirtualCardOrder: () => void;
  onPhysicalCardLink: () => void;
  onClose: () => void;
}

export const CardsOrderSelection = ({ onVirtualCardOrder, onClose, onPhysicalCardLink }: CardsOrderSelectionProps) => {
  const navigate = useNavigate();
  const handlePhysicalCardOrder = useCallback(() => {
    onClose();
    navigate("/card-order/new");
  }, [onClose, navigate]);

  const cardOptions = useMemo(
    () => [
      {
        icon: Smartphone,
        title: "Cartão virtual",
        description: "Cartão digital instantâneo para compras online",
        onClick: onVirtualCardOrder,
      },
      {
        icon: CreditCard,
        title: "Cartão físico",
        description: "Cartão físico entregue no seu endereço",
        onClick: handlePhysicalCardOrder,
      },
      {
        icon: Link,
        title: "Vincular cartão físico",
        description: "Vincule um cartão físico existente",
        onClick: onPhysicalCardLink,
      },
    ],
    [onVirtualCardOrder, onPhysicalCardLink, handlePhysicalCardOrder],
  );

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Escolha o tipo de cartão que deseja pedir:</p>

      <div className="space-y-3">
        {cardOptions.map(({ icon, title, description, onClick }) => {
          const IconComponent = icon;
          return (
            <button
              key={title}
              type="button"
              onClick={onClick}
              className="cursor-pointer w-full flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
              data-testid={`card-option-${title.toLowerCase().replace(" ", "-")}`}
            >
              <div className="shrink-0">
                <IconComponent className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <div className="shrink-0">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
