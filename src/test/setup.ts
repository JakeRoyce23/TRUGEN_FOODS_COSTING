import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Unit/component tests must never use the owner's local Supabase project.
vi.stubEnv("VITE_SUPABASE_URL", "");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
