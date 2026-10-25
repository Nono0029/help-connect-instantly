import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let window = UIWindow(windowScene: windowScene)

        // Load the ViewController from Main storyboard (hosts CAPBridgeViewController)
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        if let viewController = storyboard.instantiateInitialViewController() {
            window.rootViewController = viewController
        } else {
            // Fallback: create CAPBridgeViewController directly
            let viewController = CAPBridgeViewController()
            window.rootViewController = viewController
        }

        self.window = window
        window.makeKeyAndVisible()

        // Forward URL events to Capacitor proxy
        let proxy = SceneDelegateProxy.shared
        proxy.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
