import Capacitor
import WebKit

// Capacitor's default bridge controller doesn't enable the WKWebView's native
// edge-swipe navigation gesture. Subclassing it and turning that on gives the
// real iOS interactive back/forward swipe — the page tracks the user's finger
// and reveals the previous page — instead of a played-back CSS/JS animation.
class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.allowsBackForwardNavigationGestures = true
    }
}
