import { render, screen, fireEvent } from "@testing-library/react";
import Button from "../components/ui/Button";

describe("Button", () => {
  it("renderuje children", () => {
    render(<Button>Kliknij mnie</Button>);
    expect(screen.getByText("Kliknij mnie")).toBeInTheDocument();
  });

  it("wywołuje onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Kliknij</Button>);
    fireEvent.click(screen.getByText("Kliknij"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled blokuje kliknięcie", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Kliknij
      </Button>
    );
    fireEvent.click(screen.getByText("Kliknij"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("pokazuje spinner gdy loading=true", () => {
    render(<Button loading>Zapisz</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.querySelector("svg")).toBeInTheDocument();
  });
});

