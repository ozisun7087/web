import SwiftUI
import WebKit
import GoogleMobileAds

@main
struct JLPTStudyLabApp: App {
    init() {
        MobileAds.shared.start()
    }

    var body: some Scene {
        WindowGroup {
            VStack(spacing: 0) {
                JLPTWebView()
                AdMobBanner()
            }
        }
    }
}

struct JLPTWebView: UIViewRepresentable {
    private let url = URL(string: "https://jlpt-study-lab.vercel.app/?app=ios")!

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.keyboardDismissMode = .interactive
        webView.customUserAgent = "JLPTStudyLabiOS/1.1"
        webView.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            let host = url.host ?? ""
            if host == "jlpt-study-lab.vercel.app" || host.hasSuffix("raw.githack.com") {
                decisionHandler(.allow)
            } else if navigationAction.navigationType == .linkActivated {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            } else {
                decisionHandler(.allow)
            }
        }
    }
}

struct AdMobBanner: View {
    var body: some View {
        let width = max(320, UIScreen.main.bounds.width)
        let adSize = largeAnchoredAdaptiveBanner(width: width)
        BannerViewContainer(adSize: adSize)
            .frame(width: adSize.size.width, height: adSize.size.height)
            .frame(maxWidth: .infinity)
            .background(Color.white)
    }
}

private struct BannerViewContainer: UIViewRepresentable {
    let adSize: AdSize

    func makeUIView(context: Context) -> BannerView {
        let banner = BannerView(adSize: adSize)
        // Google official iOS banner test ID. Replace before publishing.
        banner.adUnitID = "ca-app-pub-3940256099942544/2435281174"
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            banner.rootViewController = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController
        }
        banner.load(Request())
        return banner
    }

    func updateUIView(_ uiView: BannerView, context: Context) {}
}
