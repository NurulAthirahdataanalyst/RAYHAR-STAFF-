import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PageHeader, { PageHeaderProvider } from "@/components/layout/PageHeader";
import PageActions, { PageHeaderMeta, PageToolbar } from "@/components/layout/PageActions";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { role: "hr_admin" } }),
}));

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

function mount(ui: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container;
}

afterEach(() => {
  if (root) {
    act(() => {
      root!.unmount();
    });
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
});

describe("PageHeader reusable sticky component", () => {
  it("renders title, description, separator line, and portaled actions/toolbar", () => {
    const host = mount(
      <MemoryRouter initialEntries={["/settings"]}>
        <PageHeaderProvider>
          <main>
            <PageHeader />
            <div>
              <PageHeaderMeta
                title="Settings & Policies"
                description="Attendance rules and workflows for Rayhar Travels"
              />
              <PageActions>
                <button type="button">View Audit Log</button>
              </PageActions>
              <PageToolbar>
                <div>Filter Dropdown Row</div>
              </PageToolbar>
            </div>
          </main>
        </PageHeaderProvider>
      </MemoryRouter>
    );

    expect(host.querySelector("h1")?.textContent).toBe("Settings & Policies");
    expect(host.textContent).toContain("Attendance rules and workflows for Rayhar Travels");
    expect(host.querySelector("[role='separator']")).not.toBeNull();
    expect(host.querySelector("#page-header-actions")?.textContent).toContain("View Audit Log");
    expect(host.querySelector("#page-header-toolbar")?.textContent).toContain("Filter Dropdown Row");

    const stickyRoot = host.querySelector("[data-sticky-page-header='true']");
    expect(stickyRoot).not.toBeNull();
    expect(stickyRoot?.getAttribute("data-scrolled")).toBe("false");
  });

  it("toggles subtle bottom shadow when <main> scrolls and removes it at top", () => {
    const host = mount(
      <MemoryRouter initialEntries={["/employees"]}>
        <PageHeaderProvider>
          <main id="main-scroll">
            <PageHeader />
          </main>
        </PageHeaderProvider>
      </MemoryRouter>
    );

    const mainEl = host.querySelector("#main-scroll") as HTMLElement;
    const stickyRoot = host.querySelector("[data-sticky-page-header='true']")!;
    expect(stickyRoot.getAttribute("data-scrolled")).toBe("false");

    act(() => {
      Object.defineProperty(mainEl, "scrollTop", { value: 40, writable: true, configurable: true });
      mainEl.dispatchEvent(new Event("scroll"));
    });
    expect(stickyRoot.getAttribute("data-scrolled")).toBe("true");

    act(() => {
      (mainEl as any).scrollTop = 0;
      mainEl.dispatchEvent(new Event("scroll"));
    });
    expect(stickyRoot.getAttribute("data-scrolled")).toBe("false");
  });

  it("omits sticky behavior and separator line when disabled (e.g. Leave Application)", () => {
    const host = mount(
      <MemoryRouter initialEntries={["/leave/apply"]}>
        <PageHeaderProvider>
          <main>
            <PageHeader sticky={false} showSeparator={false} />
          </main>
        </PageHeaderProvider>
      </MemoryRouter>
    );

    expect(host.querySelector("h1")?.textContent).toBe("Leave Application");
    expect(host.querySelector("[role='separator']")).toBeNull();
    expect(host.querySelector("[data-sticky-page-header='true']")).toBeNull();
  });
});
