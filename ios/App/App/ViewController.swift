import Capacitor

class ViewController: CAPBridgeViewController {

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        self.bridge?.registerPluginInstance(LiveActivityPlugin())
    }
}
