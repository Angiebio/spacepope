# One-off: crop the About architecture diagram at desktop width for detail QC.
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    page.goto('http://localhost:4399/about/')
    page.wait_for_load_state('networkidle')
    page.locator('.arch-diagram').screenshot(path='tests/site-visual/reports/diagram-detail-1440.png')
    browser.close()
print('diagram cropped')
