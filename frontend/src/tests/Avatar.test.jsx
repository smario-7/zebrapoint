import { render, screen } from "@testing-library/react";
import Avatar from "../components/ui/Avatar";

describe("Avatar", () => {
  it("pokazuje inicjały z imienia i nazwiska", () => {
    render(<Avatar name="Anna Kowalska" />);
    expect(screen.getByText("AK")).toBeInTheDocument();
  });

  it("pokazuje pierwszy inicjał dla jednego słowa", () => {
    render(<Avatar name="Tester" />);
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("pokazuje ? dla pustej nazwy", () => {
    render(<Avatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});

