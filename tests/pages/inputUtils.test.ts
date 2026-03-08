import { describe, expect, test } from "bun:test";
import { preventNumberInputScroll } from "../../src/components/Forms/IncomeForm";

describe("preventNumberInputScroll", () => {
  test("blurs number input when wheel event is triggered", () => {
    let blurred = false;
    const target = {
      type: "number",
      blur: () => {
        blurred = true;
      },
    } as unknown as HTMLInputElement;

    preventNumberInputScroll({ currentTarget: target } as React.WheelEvent<HTMLInputElement>);

    expect(blurred).toBe(true);
  });

  test("does nothing for non-number input", () => {
    let blurred = false;
    const target = {
      type: "text",
      blur: () => {
        blurred = true;
      },
    } as unknown as HTMLInputElement;

    preventNumberInputScroll({ currentTarget: target } as React.WheelEvent<HTMLInputElement>);

    expect(blurred).toBe(false);
  });
});

