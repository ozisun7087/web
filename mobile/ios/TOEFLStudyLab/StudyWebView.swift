import SwiftUI
import WebKit

struct StudyWebView: UIViewRepresentable {
    private let url = URL(string: "https://toefl-ibt-2026-study-lab.vercel.app")!
    private let homeHost = "toefl-ibt-2026-study-lab.vercel.app"

    func makeCoordinator() -> Coordinator {
        Coordinator(homeHost: homeHost)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.applicationNameForUserAgent = "TOEFLStudyLabApp/1.0.57"

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.keyboardDismissMode = .interactive
        webView.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private let homeHost: String

        init(homeHost: String) {
            self.homeHost = homeHost
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            let scheme = (url.scheme ?? "").lowercased()
            let host = (url.host ?? "").lowercased()

            if (scheme == "https" && host == homeHost) || scheme == "about" || scheme == "blob" {
                decisionHandler(.allow)
                return
            }

            if scheme == "http" || scheme == "https" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url)
            }
            decisionHandler(.cancel)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            let script = """
            (function(){
              var id='toefl-native-app-ad-hide';
              if(!document.getElementById(id)){
                var s=document.createElement('style');
                s.id=id;
                s.textContent='.toefl-ad-wrap{display:none!important}';
                document.head.appendChild(s);
              }
            })();
            """
            webView.evaluateJavaScript(script)
        }

        @available(iOS 15.0, *)
        func webView(
            _ webView: WKWebView,
            requestMediaCapturePermissionFor origin: WKSecurityOrigin,
            initiatedByFrame frame: WKFrameInfo,
            type: WKMediaCaptureType,
            decisionHandler: @escaping (WKPermissionDecision) -> Void
        ) {
            let allowedOrigin = origin.protocol.lowercased() == "https" && origin.host.lowercased() == homeHost
            if allowedOrigin && type == .microphone {
                decisionHandler(.grant)
            } else {
                decisionHandler(.deny)
            }
        }
    }
}
