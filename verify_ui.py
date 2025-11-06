
import os
from playwright.sync_api import sync_playwright

def verify_ui_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set a mobile viewport to ensure the bottom navigation is visible
        context = browser.new_context(
            viewport={'width': 375, 'height': 667},
            is_mobile=True,
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1'
        )
        page = context.new_page()

        # Get the absolute path to the index.html file
        # The script is expected to run from the repository root
        file_path = os.path.abspath('index.html')

        # Navigate directly to the local HTML file
        page.goto(f'file://{file_path}')

        # Give the page a moment to ensure all styles are applied
        page.wait_for_timeout(1000)

        # Take a screenshot of the entire page
        page.screenshot(path='verification.png')

        browser.close()

if __name__ == "__main__":
    verify_ui_changes()
