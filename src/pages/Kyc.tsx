import { getApiV1KycIntegration, type KycStatus } from "@/client";
import { StandardAlert } from "@/components/ui/standard-alert";
import { useUser } from "@/context/UserContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { extractErrorMessage } from "@/utils/errorHelpers";
import { Button } from "@/components/ui/button";
import { useZendesk } from "react-use-zendesk";

const kycStatusesRequiringContact: KycStatus[] = ["rejected", "requiresAction"];

export const KycRoute = () => {
  const { user, refreshUser, isUserSignedUp } = useUser();
  const [error, setError] = useState("");
  const [withContactSupport, setWithContactSupport] = useState(false);
  const [kycUrl, setKycUrl] = useState("");
  const navigate = useNavigate();
  const { open } = useZendesk();

  useEffect(() => {
    if (!user?.kycStatus) return;

    // an issue happened during the KYC process, sumsub rejected the application
    // or an action is required, they need to contact your support
    if (kycStatusesRequiringContact.includes(user.kycStatus)) {
      setError("Seu processo de KYC encontrou um problema. Por favor, entre em contato com o suporte usando o chat.");
      setWithContactSupport(true);
      return;
    }

    // the user is not signed up, they need to sign up first
    if (!isUserSignedUp) {
      navigate("/register");
    }

    // the user is all set up, they can go to the safe deployment page
    if (user.kycStatus === "approved") {
      navigate("/safe-deployment");
    }
  }, [navigate, user, isUserSignedUp]);

  useEffect(() => {
    if (!user?.kycStatus) return;

    // regularly check the kyc status as sumsub has hooks integration
    // with gnosispay api
    const refreshStatuses: KycStatus[] = ["documentsRequested", "pending", "processing"];
    if (refreshStatuses.includes(user.kycStatus)) {
      const timeout = setTimeout(() => {
        refreshUser();
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [refreshUser, user]);

  useEffect(() => {
    getApiV1KycIntegration()
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching KYC integration:", error);
          const errorMessage = extractErrorMessage(error, "Erro desconhecido");
          setError(`Erro ao buscar integração KYC: ${errorMessage}`);
          return;
        }

        setKycUrl(data.url);
      })
      .catch((err) => {
        console.error("Error fetching KYC integration url:", err);
        setError("Erro ao buscar URL de integração KYC");
      });
  }, []);

  // users will see the sumsub iframe in case their kyc status
  // is one of the following:
  // - notStarted
  // - documentsRequested
  // - pending
  // - processing
  // - resubmissionRequested
  // - requiresAction

  return (
    <div className="grid grid-cols-6 gap-4 h-full" data-testid="kyc-page">
      {error && (
        <div className="col-span-6 lg:col-start-2 lg:col-span-4 mx-4 lg:mx-0">
          <StandardAlert
            variant="destructive"
            title="Erro"
            description={error}
            className="mt-4"
            data-testid="kyc-error-alert"
          />
          {withContactSupport && (
            <div className="flex justify-center mt-4">
              <Button onClick={() => open()} data-testid="kyc-contact-support-button">
                Entrar em contato com o suporte
              </Button>
            </div>
          )}
        </div>
      )}
      {!error && (
        <div className="col-span-6">
          {kycUrl && (
            <iframe
              src={kycUrl}
              className="w-full h-[calc(100vh-73px)]"
              title="Integração KYC"
              data-testid="kyc-iframe"
            />
          )}
        </div>
      )}
    </div>
  );
};
