import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AppRouter } from "./app/router";
import { registerPwa } from "./app/pwa";
import { AuthProvider } from "./features/auth/auth-provider";
import { preparePasswordRecovery } from "./features/auth/password-recovery";
import "./styles/globals.css";

preparePasswordRecovery();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider><AppRouter /></AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

void registerPwa();
