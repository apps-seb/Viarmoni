from playwright.sync_api import sync_playwright

def verify_site():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # 1. Verify index.html loads and has the Admin link
        print("Visiting index.html...")
        page.goto("http://localhost:8080/index.html")
        page.wait_for_load_state("domcontentloaded")

        # Check for Admin link - use first as there are multiple
        admin_link = page.locator('a[href="admin.html"]').first
        if admin_link.is_visible():
            print("Admin link found.")
        else:
            print("Admin link NOT found.")

        # Take screenshot of index
        page.screenshot(path="verification/index_page.png", full_page=True)

        # 2. Verify admin.html loads the login form
        print("Visiting admin.html...")
        page.goto("http://localhost:8080/admin.html")
        page.wait_for_load_state("domcontentloaded")

        # Check for login form
        if page.locator("#login-view").is_visible():
            print("Login view is visible.")
        else:
            print("Login view is NOT visible.")

        # Take screenshot of admin
        page.screenshot(path="verification/admin_login.png")

        browser.close()

if __name__ == "__main__":
    verify_site()
