"""Optional local browser smoke: serve the original page without rewriting scripts."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(os.environ.get('CASEY_TEST_URL','http://127.0.0.1:8000'),wait_until='domcontentloaded')
    assert page.locator('#languageSelect option').count()==3
    page.locator('#languageSelect').select_option('es-ES')
    assert page.locator('#languageSelect').input_value()=='es-ES'
    assert not errors, errors
    print('Original page loads without JavaScript exceptions.')
    browser.close()
