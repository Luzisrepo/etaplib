import webview
import threading
import time

class Api:
    """Exposed to JavaScript to allow window control."""
    def __init__(self, window):
        self.window = window

    def minimize(self):
        self.window.minimize()

def on_loaded():
    """Inject a floating control panel after the page loads."""
    # Wait a tiny bit for the page to render
    time.sleep(1)

    js_code = """
    // Create a floating button container
    var div = document.createElement('div');
    div.id = 'webview-controls';
    div.style.cssText = 'position:fixed; top:10px; right:10px; z-index:9999; background:rgba(0,0,0,0.6); padding:8px; border-radius:8px; display:flex; gap:8px;';
    
    // Fullscreen button
    var fsBtn = document.createElement('button');
    fsBtn.innerText = '⛶ Fullscreen';
    fsBtn.style.cssText = 'background:#007bff; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-size:14px;';
    fsBtn.onclick = function() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    };
    div.appendChild(fsBtn);
    
    // Minimize button (calls Python API)
    var minBtn = document.createElement('button');
    minBtn.innerText = '🗕 Minimize';
    minBtn.style.cssText = 'background:#6c757d; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-size:14px;';
    minBtn.onclick = function() {
        // 'pywebview' is automatically injected by pywebview
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.minimize();
        }
    };
    div.appendChild(minBtn);
    
    document.body.appendChild(div);
    """
    window.evaluate_js(js_code)

if __name__ == '__main__':
    # Create a window
    window = webview.create_window(
        title='ETAP-LIB',
        url='https://etaplib-vg23.vercel.app/',
        js_api=Api(None)  # placeholder, will be set below
    )

    # Assign the real window object to the API
    api = Api(window)
    window.js_api = api

    # Start the GUI, then inject our controls
    # We use a thread to wait for the page to load, then inject JS
    t = threading.Thread(target=on_loaded)
    t.daemon = True
    webview.start(debug=False, http_server=False)
    # start() blocks, so we start the injection thread before