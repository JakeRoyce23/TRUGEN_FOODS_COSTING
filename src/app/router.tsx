import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "../components/app-shell";
import { NewCostingPage } from "../features/costing/new-costing-page";
import { HistoryPage } from "../features/history/history-page";
import { HomePage } from "./pages/home-page";
import { LoginPage } from "./pages/login-page";
import { SettingsPage } from "./pages/settings-page";
import { RequireAuth } from "../features/auth/require-auth";
import { SavedCostingPage } from "../features/costing/saved-costing-page";
import { ForgotPasswordPage } from "../features/auth/forgot-password-page";
import { ResetPasswordPage } from "../features/auth/reset-password-page";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}><Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="new" element={<NewCostingPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="costings/:id" element={<SavedCostingPage />} />
        <Route path="costings/:id/edit" element={<SavedCostingPage editing />} />
      </Route></Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
