import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { StandardAlert } from "@/components/ui/standard-alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getApiV1OwnersRemoveTransactionData,
  deleteApiV1Owners,
  getApiV1EoaAccounts,
  type EoaAccount,
  deleteApiV1EoaAccountsById,
} from "@/client";
import { useUser } from "@/context/UserContext";
import { useSignTypedData } from "wagmi";
import { extractErrorMessage } from "@/utils/errorHelpers";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { Address } from "viem";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { useDelayRelay } from "@/context/DelayRelayContext";
import { useSafeSignerVerification } from "@/hooks/useSafeSignerVerification";

interface SafeOwnersDeleteConfirmationProps {
  ownerAddress: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export const SafeOwnersDeleteConfirmation = ({
  ownerAddress,
  onCancel,
  onSuccess,
}: SafeOwnersDeleteConfirmationProps) => {
  const { safeConfig } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removeSignInAccess, setRemoveSignInAccess] = useState(true);
  const { signTypedDataAsync } = useSignTypedData();
  const { smartWalletAddress, isLoading: isSmartWalletLoading } = useSmartWallet();
  const { fetchDelayQueue } = useDelayRelay();
  const { isSignerConnected, signerError, isDataLoading } = useSafeSignerVerification();

  const handleDelete = useCallback(async () => {
    if (!safeConfig?.address) {
      setError("Configuração do Safe não encontrada");
      return;
    }

    if (isSmartWalletLoading) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      // Step 1: Get transaction data to sign
      const { error: transactionError, data: transactionData } = await getApiV1OwnersRemoveTransactionData({
        query: {
          ownerToRemove: ownerAddress,
        },
      });

      if (transactionError) {
        setError(extractErrorMessage(transactionError, "Falha ao criar transação"));
        return;
      }

      if (!transactionData?.data) {
        setError("Nenhum dado de transação recebido");
        return;
      }

      // Step 2: Sign the typed data
      const signature = await signTypedDataAsync({
        ...transactionData.data,
        domain: {
          ...transactionData.data.domain,
          verifyingContract: transactionData.data.domain.verifyingContract as Address,
        },
      });

      if (!signature) {
        setError("Falha ao assinar a transação");
        return;
      }

      // Step 3: Submit the signed transaction
      const { error: deleteError } = await deleteApiV1Owners({
        body: {
          ownerToRemove: ownerAddress,
          signature,
          message: transactionData.data.message,
          smartWalletAddress,
        },
      });

      if (deleteError) {
        setError(extractErrorMessage(deleteError, "Falha ao remover proprietário"));
        return;
      }

      // Conditionally delete as a Sign-in Wallet if checkbox is checked
      if (removeSignInAccess) {
        // first we need to get the current sign-in accounts
        getApiV1EoaAccounts()
          .then((response) => {
            let signInWallets: EoaAccount[] = [];

            if (response.data?.data?.eoaAccounts) {
              signInWallets = response.data.data.eoaAccounts;
            }

            // find the sign-in wallet to delete
            const signInWalletToDelete = signInWallets.find((account) => account.address === ownerAddress);

            if (!signInWalletToDelete?.id) {
              return;
            }

            deleteApiV1EoaAccountsById({
              path: { id: signInWalletToDelete.id },
            })
              .then((response) => {
                if (response.error) {
                  setError(extractErrorMessage(response.error, "Falha ao excluir endereço de carteira"));
                  return;
                }

                toast.success("Endereço de login excluído com sucesso");
              })
              .catch((err) => {
                console.error("Error deleting EOA account:", err);
                setError("Falha ao excluir endereço de carteira");
              });
          })
          .catch((error) => {
            console.error("Failed to fetch sign-in wallets:", error);
            setError("Falha ao carregar carteiras de login");
          });
      }

      toast.success("Remoção de proprietário enfileirada com sucesso");
      fetchDelayQueue();
      onSuccess();
    } catch (err) {
      console.error("Error removing owner:", err);
      setError("Falha ao remover proprietário");
    } finally {
      setIsDeleting(false);
    }
  }, [
    ownerAddress,
    safeConfig?.address,
    signTypedDataAsync,
    onSuccess,
    smartWalletAddress,
    isSmartWalletLoading,
    removeSignInAccess,
    fetchDelayQueue,
  ]);

  return (
    <div className="space-y-6">
      {!isSignerConnected && !isDataLoading && (
        <StandardAlert
          variant="destructive"
          description="Você deve estar conectado com uma conta que seja assinante da conta Gnosis Pay"
        />
      )}

      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-3 bg-destructive/10 rounded-full">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Remover proprietário do Safe</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Tem certeza de que deseja remover este proprietário do seu Safe? Esta ação não pode ser desfeita e será processada em 3 minutos.
          </p>
        </div>

        <div className="w-full p-3 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Endereço do proprietário</div>
          <div className="font-mono text-sm text-foreground break-all">{ownerAddress}</div>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <Checkbox
          id="remove-signin-access"
          checked={removeSignInAccess}
          onCheckedChange={(checked: boolean) => setRemoveSignInAccess(checked === true)}
          disabled={isDeleting}
        />
        <label
          htmlFor="remove-signin-access"
          className="text-sm text-foreground leading-none cursor-pointer select-none"
        >
          Remover este endereço da possibilidade de login
        </label>
      </div>

      <StandardAlert
        variant="warning"
        title="Importante"
        description="Remover este proprietário revogará seu acesso para assinar transações e gerenciar o Safe. Tenha certeza antes de prosseguir."
      />

      {error && <StandardAlert variant="destructive" title="Erro" description={error} />}
      {signerError && <StandardAlert variant="destructive" description={signerError.message} />}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isDeleting}>
          Cancelar
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={handleDelete}
          disabled={isDeleting || !isSignerConnected || !!signerError}
          loading={isDeleting}
        >
          {isDeleting ? "Removendo..." : "Remover proprietário"}
        </Button>
      </div>
    </div>
  );
};
