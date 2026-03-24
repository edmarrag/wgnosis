import { getApiV1AuthNonce, postApiV1AuthChallenge } from "@/client";
import { client } from "@/client/client.gen";
import { CollapsedError } from "@/components/collapsedError";
import { isTokenExpired } from "@/utils/isTokenExpired";
import { isTokenWithUserId } from "@/utils/isTokenWithUserId";
import { differenceInMilliseconds, fromUnixTime } from "date-fns";
import { jwtDecode } from "jwt-decode";
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SiweMessage } from "siwe";
import { toast } from "sonner";
import { getAddress } from "viem";
import { getExtensionAddress, signLoginMessage } from "@/lib/extSigner";
import { getAppUrl } from "@/utils/env";

export const LOCALSTORAGE_JWT_KEY = "gp-ui.jwt";

type AuthContextProps = {
  children: ReactNode | ReactNode[];
};

export type IAuthContext = {
  getJWT: () => Promise<string | undefined>;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  jwtContainsUserId: boolean;
  updateJwt: (newJwt: string) => void;
  updateClient: (optionalJwt?: string) => void;
  showInitializingLoader: boolean;
  renewToken: () => Promise<string | undefined>;
};

const AuthContext = createContext<IAuthContext | undefined>(undefined);

const AuthContextProvider = ({ children }: AuthContextProps) => {
  const [jwt, setJwt] = useState<string | null>(null);
  const [jwtContainsUserId, setJwtContainsUserId] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLocaStorageLoading, setIsLocaStorageLoading] = useState(true);
  const [contextKey, setContextKey] = useState(0);
  const [extAddress, setExtAddress] = useState<string | undefined>(undefined);
  const renewalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const renewalInProgressRef = useRef(false);
  const previousAddressRef = useRef<string | undefined>(extAddress);
  const jwtAddressKey = useMemo(() => {
    if (!extAddress) return "";
    return `${LOCALSTORAGE_JWT_KEY}.${extAddress}`;
  }, [extAddress]);

  useEffect(() => {
    if (!jwt) {
      setJwtContainsUserId(false);
      return;
    }

    setJwtContainsUserId(isTokenWithUserId(jwt));
  }, [jwt]);

  useEffect(() => {
    if (!jwtAddressKey) {
      return;
    }

    // Reset loading state when address changes
    setIsLocaStorageLoading(true);

    const storedJwt = localStorage.getItem(jwtAddressKey);

    if (storedJwt) {
      setJwt(storedJwt);
    } else {
      // Clear JWT if no stored token for this address
      setJwt(null);
    }

    // Mark loading as complete after localStorage read
    setIsLocaStorageLoading(false);
  }, [jwtAddressKey]);

  // Handle app refresh when address changes
  useEffect(() => {
    const currentAddress = extAddress;
    const previousAddress = previousAddressRef.current;

    // Skip on initial mount (when both are the same)
    if (previousAddress === currentAddress) {
      return;
    }

    // Skip if this is the first address being set (from undefined to an address)
    if (previousAddress === undefined && currentAddress) {
      previousAddressRef.current = currentAddress;
      return;
    }

    // Address changed from one valid address to another - remount context children
    if (previousAddress && currentAddress && previousAddress !== currentAddress) {
      previousAddressRef.current = currentAddress;
      setIsLocaStorageLoading(true);
      setContextKey((prev) => prev + 1); // Force remount of children
      return;
    }

    // Update the ref for other cases
    previousAddressRef.current = currentAddress;
  }, [extAddress]);

  const isAuthenticated = useMemo(() => {
    const isExpired = isTokenExpired(jwt);

    return !!jwt && !isExpired && !isAuthenticating && !!extAddress;
  }, [jwt, isAuthenticating, extAddress]);

  const showInitializingLoader = useMemo(() => {
    // Show loader while authenticating
    return isAuthenticating;
  }, [isAuthenticating]);

  const updateClient = useCallback(
    (optionalJwt?: string) => {
      const updatedJwt = optionalJwt || jwt;
      client.setConfig({
        headers: {
          Authorization: `Bearer ${updatedJwt}`,
        },
      });

      setIsAuthenticating(false);
    },
    [jwt],
  );

  useEffect(() => {
    if (!jwt) {
      return;
    }

    updateClient();
  }, [jwt, updateClient]);

  const updateJwt = useCallback(
    (newJwt: string) => {
      localStorage.setItem(jwtAddressKey, newJwt);
      setJwt(newJwt);
    },
    [jwtAddressKey],
  );

  const renewToken = useCallback(async () => {
    // If already authenticating, skip duplicate request
    if (renewalInProgressRef.current) {
      return;
    }

    renewalInProgressRef.current = true;

    try {
      setIsAuthenticating(true);
      let currentAddress = extAddress;
      if (!currentAddress) {
        const start = Date.now();
        const maxWaitMs = 60000;
        while (Date.now() - start < maxWaitMs) {
          try {
            currentAddress = await getExtensionAddress(1500);
            if (currentAddress) {
              setExtAddress(currentAddress);
              break;
            }
          } catch (_) {
            // extensão pode estar bloqueada: o background já tenta abrir o side panel
          }
          await new Promise((r) => setTimeout(r, 800));
        }
        if (!currentAddress) {
          setIsAuthenticating(false);
          return;
        }
      }
      const storageKey = `${LOCALSTORAGE_JWT_KEY}.${currentAddress}`;
      const { data, error } = await getApiV1AuthNonce();

      if (error) {
        toast.error(<CollapsedError title="Error getting nonce" error={error} />);
        console.error(error);
        setIsAuthenticating(false);
        return;
      }

      if (!data) {
        console.error("No nonce returned");
        toast.error("No nonce returned");
        setIsAuthenticating(false);
        return;
      }

      // Ensure address is properly checksummed for EIP-55 compliance
      let checksummedAddress: string;
      try {
        checksummedAddress = getAddress(currentAddress!);
      } catch (error) {
        console.error("Invalid address format:", currentAddress, error);
        toast.error("Invalid wallet address format");
        setIsAuthenticating(false);
        return;
      }

      const appOrigin = getAppUrl();
      const appDomain = (() => {
        try {
          return new URL(appOrigin).host;
        } catch {
          return "app.gnosispay.com";
        }
      })();
      const message = new SiweMessage({
        domain: appDomain,
        address: checksummedAddress,
        statement: "Sign in with Ethereum to the app.",
        uri: appOrigin,
        version: "1",
        chainId: 100,
        nonce: data,
        issuedAt: new Date().toISOString(),
      });

      const preparedMessage = message.prepareMessage();
      // background irá abrir o Side Panel quando receber o pedido de assinatura
      let signature = "";

      try {
        signature = await signLoginMessage(preparedMessage);
      } catch (error) {
        console.error("Error signing message", error);
        setIsAuthenticating(false);
        return;
      }

      if (!signature) {
        console.error("No signature returned");
        setIsAuthenticating(false);
        return;
      }

      try {
        const { data, error } = await postApiV1AuthChallenge({
          body: {
            message: preparedMessage,
            signature,
          },
        });

        if (error) {
          toast.error(<CollapsedError title="Error validating message" error={error} />);
          console.error(error);
          setIsAuthenticating(false);
          return;
        }

        if (!data?.token) {
          console.error("No token returned");
          toast.error(<CollapsedError title="Error validating message" error={error} />);
          setIsAuthenticating(false);
          return;
        }

        try {
          localStorage.setItem(storageKey, data.token);
        } catch (_) {}
        setJwt(data.token);
        updateClient(data.token);
        setIsAuthenticating(false);
        return data.token as string;
      } catch (error) {
        console.error("Error validating message", error);
        toast.error(<CollapsedError title="Error validating message" error={error} />);
        setIsAuthenticating(false);
        return;
      }
    } catch (error) {
      console.error("Error renewing token", error);
      setIsAuthenticating(false);
      return;
    } finally {
      renewalInProgressRef.current = false;
    }
  }, [extAddress, updateClient]);

  // Set up automatic JWT renewal timeout, simpler approach than with an interceptor
  // see https://heyapi.dev/openapi-ts/clients/fetch#interceptors
  useEffect(() => {
    // Clear any existing timeout when setting up a new one
    if (renewalTimeoutRef.current) {
      clearTimeout(renewalTimeoutRef.current);
      renewalTimeoutRef.current = null;
    }

    // Only set up timeout if we have a valid JWT
    if (!jwt || isTokenExpired(jwt)) {
      return;
    }

    try {
      const decodedToken = jwtDecode(jwt);

      if (!decodedToken.exp) {
        return;
      }

      const expirationDate = fromUnixTime(decodedToken.exp);
      const currentDate = new Date();
      const timeUntilExpiry = differenceInMilliseconds(expirationDate, currentDate);

      // Set timeout to renew when token expires
      const timeoutDelay = Math.max(0, timeUntilExpiry);

      renewalTimeoutRef.current = setTimeout(() => {
        console.info("JWT renewal timeout triggered, renewing token...");
        renewToken();
      }, timeoutDelay);
    } catch (error) {
      console.error("Error setting up JWT renewal timeout:", error);
    }

    // Cleanup function to clear timeout when component unmounts or effect re-runs
    return () => {
      if (renewalTimeoutRef.current) {
        clearTimeout(renewalTimeoutRef.current);
        renewalTimeoutRef.current = null;
      }
    };
  }, [jwt, renewToken]);

  useEffect(() => {
    // Don't proceed until localStorage loading is complete
    if (isLocaStorageLoading) {
      return;
    }

    const expired = isTokenExpired(jwt);

    if (jwt !== null && !expired) {
      // token is valid, no need to renew
      return;
    }

    renewToken();
  }, [jwt, isLocaStorageLoading, renewToken]);

  const getJWT = useCallback(async () => {
    const expired = isTokenExpired(jwt);

    if (!jwt || expired) {
      return renewToken();
    }

    return jwt;
  }, [jwt, renewToken]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAuthenticating,
        getJWT,
        jwtContainsUserId,
        updateJwt,
        updateClient,
        showInitializingLoader,
        renewToken,
      }}
    >
      <div key={contextKey}>{children}</div>
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a AuthContextProvider");
  }
  return context;
};

export { AuthContextProvider, useAuth };
