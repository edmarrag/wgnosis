import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCallback } from "react";

export const NotFound = () => {
  const navigate = useNavigate();

  const handleGoHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  return (
    <div className="grid grid-cols-6 gap-4 h-full mt-4">
      <div className="col-span-6 lg:col-start-2 lg:col-span-4">
        <div className="mx-4 lg:mx-0 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Página não encontrada</h2>
            <p className="text-muted-foreground max-w-md">
              Desculpe, a página que você procura não existe ou foi movida.
            </p>
          </div>

          <Button onClick={handleGoHome} className="flex items-center gap-2">
            Ir para a página inicial
          </Button>
        </div>
      </div>
    </div>
  );
};
