import { Buffer } from "buffer";
import { ThemeProvider } from "@/context/ThemeContext.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import { wagmiAdapter } from "./wagmi.ts";

import "./index.css";
import { client } from "./client/client.gen.ts";
import { AuthContextProvider } from "./context/AuthContext.tsx";
import { UserContextProvider } from "./context/UserContext.tsx";
import { IBANContextProvider } from "./context/IBANContext.tsx";
import { CardsContextProvider } from "./context/CardsContext.tsx";
import { Toaster } from "sonner";
import { DelayRelayContextProvider } from "./context/DelayRelayContext.tsx";
import { CardTransactionsContextProvider } from "./context/CardTransactionsContext.tsx";
import { OnchainTransactionsContextProvider } from "./context/OnchainTransactionsContext.tsx";
import { IbanTransactionsContextProvider } from "./context/IbanTransactionsContext.tsx";
import { OrdersContextProvider } from "./context/OrdersContext.tsx";
import { ZendeskProvider } from "react-use-zendesk";

const inferBaseUrl = () => {
  const fromEnv = import.meta.env.VITE_GNOSIS_PAY_API_BASE_URL as string | undefined;
  if (fromEnv) return fromEnv;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "/";
  return "https://api.gnosispay.com/";
};
export const BASE_URL = inferBaseUrl();
export const zendeskKey = import.meta.env.VITE_ZENDESK_KEY;

globalThis.Buffer = Buffer;

const queryClient = new QueryClient();
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

if (!zendeskKey) {
  console.warn("VITE_ZENDESK_API_KEY is not set");
}

client.setConfig({
  // set default base url for requests
  baseUrl: BASE_URL,
});
try {
  const sameOrigin =
    typeof window !== "undefined" &&
    (BASE_URL === "/" ||
      BASE_URL.startsWith(window.location.origin) ||
      BASE_URL.startsWith(window.location.protocol + "//" + window.location.host));
  if (sameOrigin) {
    console.warn(
      "BASE_URL aponta para a mesma origem do frontend. Em produção/development com API separada, defina VITE_GNOSIS_PAY_API_BASE_URL adequadamente."
    );
  }
} catch {}
const toHeaderObj = (h: Headers | Record<string, string>) => {
  try {
    if (h instanceof Headers) {
      return Object.fromEntries(Array.from(h.entries()));
    }
    return h;
  } catch {
    return {};
  }
};
client.interceptors.request.use((req, opts) => {
  console.info("API request", {
    url: req.url,
    method: req.method,
    baseUrl: opts.baseUrl,
    headers: toHeaderObj(req.headers as Headers),
  });
  return req;
});
client.interceptors.response.use(async (res, req, opts) => {
  const ct = res.headers.get("content-type");
  const status = res.status;
  let preview: string | undefined;
  try {
    if (ct && ct.includes("application/json")) {
      const clone = res.clone();
      const txt = await clone.text();
      preview = txt.slice(0, 300);
    }
  } catch {}
  console.info("API response", {
    url: req.url,
    status,
    ok: res.ok,
    contentType: ct,
    preview,
  });
  return res;
});
client.interceptors.error.use((error, res, req, opts) => {
  console.error("API error", {
    url: req?.url,
    method: req?.method,
    baseUrl: opts?.baseUrl,
    status: res?.status,
    name: (error as any)?.name,
    message: (error as any)?.message,
  });
  return error;
});

ReactDOM.createRoot(rootElement).render(
  <BrowserRouter>
    <ThemeProvider defaultTheme="system" storageKey="gp-ui-theme">
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <AuthContextProvider>
            <UserContextProvider>
              <IBANContextProvider>
                <ZendeskProvider apiKey={zendeskKey}>
                  <CardsContextProvider>
                    <OrdersContextProvider>
                      <CardTransactionsContextProvider>
                        <OnchainTransactionsContextProvider>
                          <IbanTransactionsContextProvider>
                            <DelayRelayContextProvider>
                              <App />
                              <Toaster offset={{ right: "6rem", bottom: "1rem" }} expand />
                            </DelayRelayContextProvider>
                          </IbanTransactionsContextProvider>
                        </OnchainTransactionsContextProvider>
                      </CardTransactionsContextProvider>
                    </OrdersContextProvider>
                  </CardsContextProvider>
                </ZendeskProvider>
              </IBANContextProvider>
            </UserContextProvider>
          </AuthContextProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  </BrowserRouter>,
);
