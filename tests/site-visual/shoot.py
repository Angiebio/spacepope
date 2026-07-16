# ==========================================================================
# spacepope.ai — tests/site-visual/shoot.py · v1.0 — 15JUL2026
# --------------------------------------------------------------------------
# The site's portrait sitting: every key route at phone / tablet / desktop
# widths. A cathedral you cannot walk into on a phone is a rood screen, not
# a church — so the small viewport is a first-class citizen here, and the
# script also measures horizontal overflow, the one sin the roadmap names.
# ==========================================================================
from playwright.sync_api import sync_playwright

# NB: 4321 is Astro's default and this machine often has another Astro dev
# server parked on it — use an uncommon port so we photograph OUR church.
BASE = 'http://localhost:4399'
OUT = 'tests/site-visual/reports'

ROUTES = {
    'home': '/',
    'chapter': '/chronicle/1/',
    'observer': '/observer/',
    'dispatch': '/observer/2026-07-15-dispatch-000-the-observer-turns-its-lens/',
    'specola': '/specola/2026-07-15-gpt-5-6-sol-terra-luna/',
    'encyclicals-empty': '/encyclicals/',
    'angelus-empty': '/angelus/',
    'college': '/college/',
    'atlas': '/atlas/',
    'about': '/about/',
    'acta-empty': '/acta/',
}
WIDTHS = [375, 768, 1440]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    problems = []
    for width in WIDTHS:
        page = browser.new_page(viewport={'width': width, 'height': 900})
        for name, route in ROUTES.items():
            page.goto(BASE + route)
            page.wait_for_load_state('networkidle')
            # The one named sin: horizontal scroll on mobile.
            overflow = page.evaluate(
                'document.documentElement.scrollWidth - document.documentElement.clientWidth'
            )
            if overflow > 1:
                problems.append(f'{name} @ {width}px overflows by {overflow}px')
            page.screenshot(path=f'{OUT}/{name}-{width}.png', full_page=True)
        page.close()
    browser.close()

if problems:
    print('OVERFLOW PROBLEMS:')
    for pr in problems:
        print(' -', pr)
else:
    print('No horizontal overflow at any width. All screenshots captured.')
