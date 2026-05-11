import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopNav } from "@/components/TopNav";

describe("TopNav", () => {
  it("renders the ARQUD wordmark when variant is 'agency'", () => {
    render(<TopNav variant="agency" />);
    expect(screen.getByText("ARQUD")).toBeInTheDocument();
  });

  it("renders all five agency-section labels when variant is 'agency'", () => {
    render(<TopNav variant="agency" />);
    for (const label of [
      "Overview",
      "Clients",
      "Campaigns",
      "Finances",
      "Files",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders all five client-section labels and the brand name when variant is 'client'", () => {
    render(<TopNav variant="client" brandName="SPARKLING AUTO" />);
    for (const label of [
      "Dashboard",
      "Campaigns",
      "Invoices",
      "Reports",
      "Documents",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("SPARKLING AUTO")).toBeInTheDocument();
  });
});
