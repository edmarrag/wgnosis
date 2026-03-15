import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCallback } from "react";

interface StatusHelpIconProps {
  type: "pending" | "refund" | "pending-merchant" | "reversal" | "rewards";
}

export const StatusHelpIcon = ({ type }: StatusHelpIconProps) => {
  const getHelpText = useCallback(() => {
    switch (type) {
      case "pending":
        return "Esta transação está aguardando liquidação.";
      case "refund":
        return "Este pagamento foi parcialmente reembolsado. O reembolso será transferido em até 10 dias úteis a partir da data do pagamento.";
      case "pending-merchant":
        return "Se não for confirmado pelo estabelecimento, será revertido em 11 dias.";
      case "reversal":
        return "Este pagamento é a reversão de uma transação anterior.";
      case "rewards":
        return <>Saiba mais sobre o <a href="https://help.gnosispay.com/hc/en-us/articles/39631920738452-About-the-Gnosis-Pay-GNO-Cashback-Programmes" target="_blank" rel="noopener noreferrer" className="text-muted-foreground underline">programa de recompensas</a></>;
      default:
        return "";
    }
  }, [type]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          className="inline-flex items-center justify-center ml-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label={`Ajuda sobre o status ${type}`}
          role="button"
          tabIndex={0}
          onClick={handleClick}
          data-testid={`help-icon-${type}`}
        >
          <HelpCircle className="w-3 h-3" />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm" align="start" data-testid={`help-content-${type}`}>
        <div className="text-foreground">{getHelpText()}</div>
      </PopoverContent>
    </Popover>
  );
};
