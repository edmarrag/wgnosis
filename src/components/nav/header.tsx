import darklogo from "../../assets/GP-logo-white.svg";
import lightLogo from "../../assets/GP-logo-black.svg";
import { ModeToggle } from "../theme-toggle";
import { useTheme } from "../../context/ThemeContext";
import { NavLink } from "react-router-dom";
import { menuRoutes } from "@/App";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { ConnectExtensionModal } from "@/components/connect/ConnectExtensionModal";

export const HeaderNavBar = () => {
  const { effectiveTheme } = useTheme();
  const { isAuthenticated, renewToken } = useAuth();
  const [connectOpen, setConnectOpen] = useState(false);

  const handleConnect = useCallback(() => {
    setConnectOpen(true);
  }, []);

  return (
    <>
      <header className="w-full border-b hidden lg:block">
        <div className="py-4 flex items-center px-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-2">
                <a href="/">
                  <img src={effectiveTheme === "light" ? lightLogo : darklogo} alt="Gnosis Pay logo" />
                </a>
              </div>
              <div className="flex items-center gap-8">
                {menuRoutes.map((route) => (
                  <NavLink
                    key={route.path}
                    to={route.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2 text-sm font-semibold transition-colors ${
                        isActive ? "text-link-active" : "text-link-secondary"
                      }`
                    }
                  >
                    <route.icon size={16} />
                    {route.label}
                  </NavLink>
                ))}
              </div>
            </div>
            <div className="flex gap-2 items-center justify-end">
              {isAuthenticated ? <Button disabled>Conectado</Button> : <Button onClick={handleConnect}>Conectar</Button>}
              <ModeToggle />
            </div>
          </div>
        </div>
      </header>
      <ConnectExtensionModal open={connectOpen} onOpenChange={setConnectOpen} />
    </>
  );
};
