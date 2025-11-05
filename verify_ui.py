
import os
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Get the absolute path to the HTML file
        file_path = os.path.abspath('index.html')

        page.goto(f'file://{file_path}')

        # Set a mobile viewport to ensure the bottom navigation is visible
        page.set_viewport_size({'width': 375, 'height': 667})

        # Wait for the page to load completely
        page.wait_for_load_state('networkidle')

        # Take a screenshot of the bottom navigation
        page.screenshot(path='verification.png')

        browser.close()

if __name__ == '__main__':
    run()
