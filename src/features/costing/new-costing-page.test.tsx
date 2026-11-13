import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { NewCostingPage } from "./new-costing-page";

describe("NewCostingPage", () => {
  beforeEach(() => vi.spyOn(window, "confirm").mockReturnValue(true));
  afterEach(() => vi.restoreAllMocks());
  it("adds and removes local ingredient cards and flags incomplete totals", () => {
    render(<MemoryRouter><NewCostingPage /></MemoryRouter>);

    expect(screen.getAllByTestId("ingredient-card")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Remove ingredient 1" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Add Ingredient" }));
    expect(screen.getAllByTestId("ingredient-card")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Remove ingredient 2" }));
    expect(screen.getAllByTestId("ingredient-card")).toHaveLength(1);
    expect(screen.getByTestId("total-cost")).toHaveTextContent("—");
  });

  it("shows validation feedback when reviewing an incomplete costing", () => {
    render(<MemoryRouter><NewCostingPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Review costing" }));

    expect(screen.getByText("Enter a food or order name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a positive whole number.")).toBeInTheDocument();
    expect(screen.getByLabelText("Food / order name")).toHaveFocus();
  });

  it("updates quantities, prices, markup, and both rounded and exact summaries instantly", () => {
    render(<MemoryRouter><NewCostingPage /></MemoryRouter>);
    const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
    expect(screen.getByLabelText("Tubo / markup (%)")).toHaveValue("35");
    expect(screen.getByLabelText("Optional price rounding")).toHaveValue("none");
    change("Food / order name", "Party tray");
    change("Number of servings", "10");
    change("Ingredient name", "Carrots");
    change("Purchased quantity", "1");
    change("Purchase price (₱)", "1300");
    change("Actual quantity used", "0.5");
    change("Optional price rounding", "10");
    expect(screen.getByTestId("ingredient-cost")).toHaveTextContent("₱650.00");
    expect(screen.getByTestId("calculated-profit")).toHaveTextContent("₱227.50");
    expect(screen.getByTestId("exact-price")).toHaveTextContent("₱877.50");
    expect(screen.getByTestId("exact-per-serving")).toHaveTextContent("₱87.75");
    expect(screen.getByTestId("rounded-price")).toHaveTextContent("₱880.00");
    expect(screen.getByTestId("rounded-per-serving")).toHaveTextContent("₱88.00");
    expect(screen.getByTestId("rounded-profit")).toHaveTextContent("₱230.00");

    change("Purchase price (₱)", "120");
    change("Actual quantity used", "0.25");
    change("Tubo / markup (%)", "50");
    expect(screen.getByTestId("total-cost")).toHaveTextContent("₱30.00");
    expect(screen.getByTestId("exact-price")).toHaveTextContent("₱45.00");
    change("Optional price rounding", "none");
    expect(screen.queryByTestId("rounded-profit")).not.toBeInTheDocument();
    expect(screen.getByTestId("exact-price")).toHaveTextContent("₱45.00");
    change("Purchased quantity", "0");
    expect(screen.getByTestId("total-cost")).toHaveTextContent("—");
    expect(screen.getByLabelText("Purchased quantity")).toHaveAttribute("aria-invalid", "true");
    change("Purchased quantity", "1");
    expect(screen.getByTestId("total-cost")).toHaveTextContent("₱30.00");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByTestId("total-cost")).toHaveTextContent("—");
    expect(screen.getByLabelText("Tubo / markup (%)")).toHaveValue("35");
  });

  it("keeps surviving row state and recalculates after removing another ingredient", () => {
    render(<MemoryRouter><NewCostingPage /></MemoryRouter>);
    const fill = (index: number, name: string, price: string) => {
      const card = within(screen.getAllByTestId("ingredient-card")[index]);
      for (const [label, value] of [["Ingredient name", name], ["Purchased quantity", "1"], ["Purchase price (₱)", price], ["Actual quantity used", "1"]]) {
        fireEvent.change(card.getByLabelText(label), { target: { value } });
      }
    };
    fill(0, "Carrots", "120");
    fireEvent.click(screen.getByRole("button", { name: "Add Ingredient" }));
    expect(screen.getByText(/Partial estimate: 1 of 2/)).toBeInTheDocument();
    fill(1, "Rice", "530");
    expect(screen.getByTestId("total-cost")).toHaveTextContent("₱650.00");
    expect(screen.queryByText(/Partial estimate/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove ingredient 1" }));
    expect(screen.getByLabelText("Ingredient name")).toHaveValue("Rice");
    expect(screen.getByTestId("total-cost")).toHaveTextContent("₱530.00");
    fireEvent.change(screen.getByLabelText("Purchase price (₱)"), { target: { value: "" } });
    expect(screen.getByTestId("total-cost")).toHaveTextContent("—");
  });

  it("labels valid money as estimates until order details are complete and removes stale ready status", () => {
    render(<MemoryRouter><NewCostingPage /></MemoryRouter>);
    const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
    for (const [label, value] of [["Ingredient name", "Rice"], ["Purchased quantity", "1"], ["Purchase price (₱)", "100"], ["Actual quantity used", "1"]]) change(label, value);
    expect(screen.getByTestId("exact-price")).toHaveTextContent("₱135.00");
    expect(screen.getByTestId("costing-readiness")).toHaveTextContent("Incomplete costing · Estimates only");
    change("Food / order name", "Rice bowls");
    change("Number of servings", "10");
    expect(screen.getByTestId("costing-readiness")).toHaveTextContent("All entries valid · Not saved");
    expect(screen.getByTestId("selected-markup")).toHaveTextContent("35%");
    change("Tubo / markup (%)", "12.34");
    expect(screen.getByTestId("selected-markup")).toHaveTextContent("12.34%");
    change("Tubo / markup (%)", "12.345");
    expect(screen.getByTestId("selected-markup")).toHaveTextContent("—");
    expect(screen.getByTestId("exact-price")).toHaveTextContent("—");
    expect(screen.getByTestId("costing-readiness")).toHaveTextContent("Incomplete costing");
    change("Tubo / markup (%)", "0");
    change("Food / order name", " ");
    expect(screen.getByTestId("costing-readiness")).toHaveTextContent("Incomplete costing");
    expect(screen.getByRole("button", { name: /Save costing/ })).toBeDisabled();
  });

  it("preserves entries when removal or reset is cancelled and focuses surviving rows", () => {
    render(<MemoryRouter><NewCostingPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Ingredient name"), { target: { value: "Eggs" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Ingredient" }));
    expect(screen.getAllByLabelText("Ingredient name")[1]).toHaveFocus();
    vi.mocked(window.confirm).mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Remove ingredient 1" }));
    expect(screen.getAllByTestId("ingredient-card")).toHaveLength(2);
    expect(screen.getAllByLabelText("Ingredient name")[0]).toHaveValue("Eggs");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getAllByLabelText("Ingredient name")[0]).toHaveValue("Eggs");
    vi.mocked(window.confirm).mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove ingredient 1" }));
    expect(screen.getByLabelText("Ingredient name")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText("Food / order name")).toHaveFocus();
  });

  it("reviews all missing fields, focuses issues in form order, and links error descriptions", () => {
    render(<MemoryRouter><NewCostingPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Review costing" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Check 6 fields");
    expect(screen.getByLabelText("Food / order name")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Food / order name"), { target: { value: "Tray" } });
    fireEvent.click(screen.getByRole("button", { name: "Fix first issue" }));
    expect(screen.getByLabelText("Number of servings")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Number of servings"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Ingredient name"), { target: { value: "Rice" } });
    fireEvent.change(screen.getByLabelText("Purchased quantity"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Fix first issue" }));
    expect(screen.getByLabelText("Purchase price (₱)")).toHaveFocus();
    expect(screen.getByLabelText("Purchase price (₱)")).toHaveAccessibleDescription(/This field is required/);
  });

  it("moves focus between results and ingredients without losing data", () => {
    render(<MemoryRouter><NewCostingPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Ingredient name"), { target: { value: "Milk" } });
    fireEvent.click(screen.getByRole("button", { name: "View results" }));
    expect(screen.getByRole("heading", { name: "Costing summary" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Back to ingredients" }));
    expect(screen.getByLabelText("Ingredient name")).toHaveFocus();
    expect(screen.getByLabelText("Ingredient name")).toHaveValue("Milk");
  });
});
