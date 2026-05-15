import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComingSoon } from "@/components/ComingSoon";

describe("ComingSoon", () => {
  it("renders the section name as heading", () => {
    render(<ComingSoon section="Overview" phase={3} bullets={["Track KPIs"]} />);
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("renders the phase badge", () => {
    render(<ComingSoon section="Finances" phase={6} bullets={["Create invoices"]} />);
    expect(screen.getByText(/Coming Soon — Phase 6/)).toBeInTheDocument();
  });

  it("renders all bullet points", () => {
    render(
      <ComingSoon
        section="Files"
        phase={7}
        bullets={["Upload files", "Share with clients", "Organise by category"]}
      />,
    );
    expect(screen.getByText("Upload files")).toBeInTheDocument();
    expect(screen.getByText("Share with clients")).toBeInTheDocument();
    expect(screen.getByText("Organise by category")).toBeInTheDocument();
  });
});
