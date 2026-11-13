import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../../app/pages/login-page";
import { AuthProvider } from "./auth-provider";

it("shows setup guidance and disables real login when no project is configured", () => {
  render(<MemoryRouter><AuthProvider client={null}><LoginPage /></AuthProvider></MemoryRouter>);
  expect(screen.getByText(/Supabase is not configured/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Log in" })).toBeDisabled();
  expect(screen.queryByText(/Continue to preview/)).not.toBeInTheDocument();
});
