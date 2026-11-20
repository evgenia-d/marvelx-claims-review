// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsLaptop } from "./useIsLaptop";

afterEach(() => vi.unstubAllGlobals());

describe("useIsLaptop", () => {
  it("is true when matchMedia is missing (jsdom)", () => {
    expect(useIsLaptopValue()).toBe(true);
  });

  it("follows the media query", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    expect(useIsLaptopValue()).toBe(false);
  });
});

const useIsLaptopValue = () => renderHook(useIsLaptop).result.current;
