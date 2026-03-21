import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import FaqSection from "../components/landing/FaqSection";

function renderFaq() {
  return render(
    <I18nextProvider i18n={i18n}>
      <FaqSection />
    </I18nextProvider>
  );
}

describe("FaqSection", () => {
  it("pokazuje nagłówek FAQ", () => {
    renderFaq();
    expect(screen.getByText("Najczęstsze pytania")).toBeInTheDocument();
  });

  it("pokazuje tekst o regulaminie i polityce prywatności", () => {
    renderFaq();
    expect(
      screen.getByText(/regulaminie, polityce prywatności oraz sekcji/i)
    ).toBeInTheDocument();
  });
});
