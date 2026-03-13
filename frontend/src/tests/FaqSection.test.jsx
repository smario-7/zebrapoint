import { render, screen } from "@testing-library/react";
import FaqSection from "../components/landing/FaqSection";

describe("FaqSection", () => {
  it("pokazuje nagłówek FAQ", () => {
    render(<FaqSection />);
    expect(screen.getByText("Najczęstsze pytania")).toBeInTheDocument();
  });

  it("pokazuje tekst o regulaminie i polityce prywatności", () => {
    render(<FaqSection />);
    expect(
      screen.getByText(/regulaminie, polityce prywatności oraz sekcji/i)
    ).toBeInTheDocument();
  });
});

