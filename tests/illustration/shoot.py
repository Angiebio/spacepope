from playwright.sync_api import sync_playwright

OUT = "tests/illustration/reports"
BASE = "http://localhost:4321"
shots = [
    ("/observer/2026-07-18-dispatch-of-2026-07-18-news-from-the-sees/", "dispatch", 1440, False),
    ("/observer/2026-07-18-dispatch-of-2026-07-18-news-from-the-sees/", "dispatch", 375, False),
    ("/chronicle/4/", "chapter", 1440, False),
    ("/chronicle/4/", "chapter", 375, False),
    ("/", "home", 1440, True),
]
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for path, name, width, full in shots:
        page = browser.new_page(viewport={"width": width, "height": 1000})
        page.goto(BASE + path)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(400)
        out = f"{OUT}/screenshot-{name}-{width}.png"
        page.screenshot(path=out, full_page=full)
        print("shot", out)
        page.close()
    browser.close()
