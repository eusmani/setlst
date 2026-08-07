import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // A Home Screen quick action can launch the app outright. The web layer
        // isn't listening yet, so stash it — QuickActionsPlugin replays it once
        // JavaScript registers.
        if let shortcut = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem {
            QuickActionsPlugin.pendingType = shortcut.type
        }
        return true
    }

    // A quick action used while the app is already running or suspended.
    func application(_ application: UIApplication,
                     performActionFor shortcutItem: UIApplicationShortcutItem,
                     completionHandler: @escaping (Bool) -> Void) {
        QuickActionsPlugin.handle(shortcutItem.type)
        completionHandler(true)
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// Enables the WKWebView's native interactive edge-swipe back/forward gesture, so
// navigation tracks the user's finger like a standard iPhone app. Referenced by
// Main.storyboard (customClass "MainViewController"). Defined here in the already-
// compiled AppDelegate.swift so it's part of the app target without a project edit.
class MainViewController: CAPBridgeViewController {
    // Plugins that live in the app target aren't listed in the generated
    // capacitor.config.json, so they have to be handed to the bridge by hand.
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(InstagramStoryPlugin())
        bridge?.registerPluginInstance(QuickActionsPlugin())
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.allowsBackForwardNavigationGestures = true
        addPullToRefresh()
        // Long-pressing a button or album cover popped the system "Copy / Look Up"
        // callout, which is a web-page behaviour that reads as broken in an app.
        webView?.evaluateJavaScript(
            "document.documentElement.style.webkitTouchCallout = 'none'",
            completionHandler: nil
        )
    }

    /// Native pull-to-refresh on the web view's scroll view.
    ///
    /// Attached to the scroll view rather than implemented in JavaScript so it's
    /// the real UIKit control — same rubber-band, same spinner, same haptic as
    /// every other iOS app — and it works on every screen at once.
    private func addPullToRefresh() {
        guard let scrollView = webView?.scrollView else { return }
        let control = UIRefreshControl()
        control.tintColor = UIColor(red: 0.77, green: 0.66, blue: 0.20, alpha: 1) // #C4A832
        control.addTarget(self, action: #selector(reloadFromPull(_:)), for: .valueChanged)
        scrollView.refreshControl = control
        // Let taps on the status bar scroll back to the top, as iOS users expect.
        scrollView.scrollsToTop = true
    }

    @objc private func reloadFromPull(_ control: UIRefreshControl) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        webView?.reload()
        // The bridge doesn't report load completion here, so end the refresh once
        // the spinner has been seen rather than leaving it turning forever.
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { control.endRefreshing() }
    }
}
