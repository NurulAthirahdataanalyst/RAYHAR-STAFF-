import { describe, it, expect } from "vitest";
import {
  buildSubmittedDeviceInfo,
  formatDeviceDisplay,
  getCompactDeviceInfo,
} from "@/utils/deviceInfo";

describe("deviceInfo detection and formatting", () => {
  it("detects iPhone in Safari Request Desktop Website mode instead of Mac Desktop", () => {
    const iphoneDesktopModeUA =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

    expect(
      getCompactDeviceInfo({
        userAgent: iphoneDesktopModeUA,
        maxTouchPoints: 5,
        screenWidth: 393,
        screenHeight: 852,
        platform: "MacIntel",
      })
    ).toBe("iPhone (Desktop Mode)");

    const submitted = buildSubmittedDeviceInfo({
      userAgent: iphoneDesktopModeUA,
      maxTouchPoints: 5,
      screenWidth: 393,
      screenHeight: 852,
      platform: "MacIntel",
    });

    expect(submitted).toContain("iPhone (Desktop Mode) • Safari");
    expect(formatDeviceDisplay(submitted)).toBe("iPhone (Desktop Mode) • Safari");
  });

  it("detects real Mac Desktop when maxTouchPoints is 0", () => {
    const macUA =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

    expect(
      getCompactDeviceInfo({
        userAgent: macUA,
        maxTouchPoints: 0,
        screenWidth: 1440,
        screenHeight: 900,
        platform: "MacIntel",
      })
    ).toBe("Mac Desktop");
  });

  it("detects standard iPhone, Android, and Windows devices", () => {
    expect(
      getCompactDeviceInfo({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
        maxTouchPoints: 5,
      })
    ).toBe("iPhone Mobile");

    expect(
      getCompactDeviceInfo({
        userAgent:
          "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
        maxTouchPoints: 5,
      })
    ).toBe("Android Mobile");

    expect(
      getCompactDeviceInfo({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
        maxTouchPoints: 0,
      })
    ).toBe("Windows Desktop");
  });

  it("formats legacy raw User-Agent strings cleanly for HR", () => {
    expect(
      formatDeviceDisplay(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
      )
    ).toBe("Mac / iOS Desktop Mode • Safari");
  });
});
