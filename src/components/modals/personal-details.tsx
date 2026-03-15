import { useUser } from "@/context/UserContext";
import { useUserFullName } from "@/hooks/useUserFullName";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { useMemo, useState, useCallback } from "react";
import PhoneVerificationStep from "@/components/safe-deployment/PhoneVerificationStep";
import { StandardAlert } from "../ui/standard-alert";

interface PersonalDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PersonalDetailsModal: React.FC<PersonalDetailsModalProps> = ({ open, onOpenChange }) => {
  const { user, refreshUser } = useUser();
  const fullName = useUserFullName();

  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [error, setError] = useState("");

  const formattedAddress = useMemo(() => {
    if (!user) return "";
    const parts = [user.address1, user.address2, user.city, user.postalCode, user.country].filter(Boolean);
    return parts.join("\n");
  }, [user]);

  const handleOnOpenChange = useCallback(
    (open: boolean) => {
      setIsEditingPhone(false);
      refreshUser();
      onOpenChange(open);
    },
    [onOpenChange, refreshUser],
  );

  const handleEditPhoneClick = useCallback(() => {
    setIsEditingPhone(true);
    setError("");
  }, []);

  const handlePhoneVerificationComplete = useCallback(() => {
    setIsEditingPhone(false);
    setError("");
    refreshUser();
  }, [refreshUser]);

  const handleSetError = useCallback((err: string) => {
    setError(err);
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOnOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditingPhone ? "Alterar número de telefone" : "Dados pessoais"}</DialogTitle>
        </DialogHeader>

        {isEditingPhone ? (
          <div className="space-y-4">
            {error && <StandardAlert description={error} variant="destructive" />}
            <PhoneVerificationStep
              onComplete={handlePhoneVerificationComplete}
              setError={handleSetError}
              onCancel={() => setIsEditingPhone(false)}
              title="Alterar número de telefone"
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <span className="text-sm text-muted-foreground">Nome</span>
              <div>{fullName || "Não informado"}</div>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">E-mail</span>
              <div>{user?.email || "Não informado"}</div>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Telefone</span>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {user?.phone || "Não informado"}
                  {user?.phone &&
                    (user?.isPhoneValidated ? (
                      <div className="flex items-center text-muted-foreground">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm">Verificado</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-muted-foreground">
                        <XCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm">Não verificado</span>
                      </div>
                    ))}
                </div>
                <Button variant="outline" size="sm" onClick={handleEditPhoneClick} className="w-fit">
                  Editar número de telefone
                </Button>
              </div>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Endereço</span>
              <div className="whitespace-pre-line">{formattedAddress || "Não informado"}</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
