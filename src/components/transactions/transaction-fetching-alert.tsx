import { StandardAlert } from "../ui/standard-alert";

export const TransactionFetchingAlert = () => (
  <StandardAlert
    variant="destructive"
    title="Erro ao buscar transações"
    description="Por favor, tente novamente mais tarde."
    className="mt-4"
  />
);
