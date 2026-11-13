export type MockCosting = {
  id: number;
  name: string;
  date: string;
  servings: number;
  puhunan: string;
  sellingPrice: string;
};

export const mockCostings: MockCosting[] = [
  { id: 1, name: "Chicken Pastil Trays", date: "Nov 3, 2026", servings: 24, puhunan: "₱1,245.00", sellingPrice: "₱1,690.00" },
  { id: 2, name: "Pancit Bihon Bilao", date: "Oct 31, 2026", servings: 15, puhunan: "₱780.50", sellingPrice: "₱1,055.00" },
  { id: 3, name: "Beef Caldereta Party Tray", date: "Oct 27, 2026", servings: 20, puhunan: "₱1,860.00", sellingPrice: "₱2,520.00" },
];
