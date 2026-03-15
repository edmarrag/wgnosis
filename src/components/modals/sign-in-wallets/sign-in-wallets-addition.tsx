import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StandardAlert } from "@/components/ui/standard-alert";
import { postApiV1EoaAccounts } from "@/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/utils/errorHelpers";
import { isAddress } from "viem";

interface SignInWalletsEditProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export const SignInWalletsAddition = ({ onCancel, onSuccess }: SignInWalletsEditProps) => {
  const [address, setAddress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddressChange = useCallback((value: string) => {
    setError(null);
    setAddress(value);
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedAddress = address.trim();

    if (!trimmedAddress) {
      setError("Insira um endereço de carteira");
      return;
    }

    if (!isAddress(trimmedAddress)) {
      setError("Insira um endereço de carteira válido");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    postApiV1EoaAccounts({
      body: {
        address: trimmedAddress,
      },
    })
      .then((response) => {
        if (response.error) {
          setError(extractErrorMessage(response.error, "Falha ao adicionar endereço de carteira"));
          return;
        }

        toast.success("Endereço de carteira adicionado com sucesso");
        onSuccess();
      })
      .catch((err) => {
        console.error("Error adding EOA account:", err);
        setError("Falha ao adicionar endereço de carteira");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [address, onSuccess]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleAddressChange(e.target.value);
    },
    [handleAddressChange],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="wallet-address" className="text-sm text-muted-foreground">
          Endereço de carteira
        </label>
        <Input
          id="wallet-address"
          type="text"
          value={address}
          onChange={onChange}
          placeholder="0x..."
          className="font-mono"
        />
        <div className="text-xs text-muted-foreground">
          Insira um endereço de carteira válido para usar no login
        </div>
      </div>

      {error && <StandardAlert variant="destructive" title="Erro" description={error} />}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          className="flex-1 bg-button-bg hover:bg-button-bg-hover text-button-black font-medium"
          onClick={handleSave}
          disabled={isSubmitting || !address.trim()}
          loading={isSubmitting}
        >
          {isSubmitting ? "Adicionando..." : "Adicionar carteira"}
        </Button>
      </div>
    </div>
  );
};
