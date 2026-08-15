import SwiftUI
import WebKit
import AVFoundation
import UserNotifications
import GoogleMobileAds
import UserMessagingPlatform

private let studyURL = URL(string: "https://jlpt-study-lab.vercel.app/?app=ios")!
private let shareURL = URL(string: "https://jlpt-study-lab.vercel.app")!

@main
struct JLPTStudyLabApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}

struct RootView: View {
    @StateObject private var ads = PrivacyAdsModel()
    @State private var showingSettings = false
    @State private var showingShare = false

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Text("JLPT Study Lab")
                    .font(.headline)
                Spacer()
                Button {
                    showingShare = true
                } label: {
                    Image(systemName: "square.and.arrow.up")
                }
                .accessibilityLabel("分享")

                Button {
                    showingSettings = true
                } label: {
                    Image(systemName: "gearshape")
                }
                .accessibilityLabel("設定")
            }
            .padding(.horizontal, 14)
            .frame(height: 48)
            .background(Color(uiColor: .systemBackground))

            Divider()
            JLPTWebView()

            if ads.canRequestAds {
                AdMobBanner()
            }
        }
        .task {
            await ads.prepareConsentAndAds()
        }
        .sheet(isPresented: $showingSettings) {
            SettingsView(ads: ads)
        }
        .sheet(isPresented: $showingShare) {
            ShareSheet(items: ["JLPT Study Lab", shareURL])
        }
    }
}

@MainActor
final class PrivacyAdsModel: ObservableObject {
    @Published var canRequestAds = false
    @Published var privacyOptionsRequired = false
    private var adsStarted = false

    func prepareConsentAndAds() async {
        let parameters = RequestParameters()
        await withCheckedContinuation { continuation in
            ConsentInformation.shared.requestConsentInfoUpdate(with: parameters) { _ in
                continuation.resume()
            }
        }

        do {
            try await ConsentForm.loadAndPresentIfRequired(from: nil)
        } catch {
            // A temporary consent-form failure must not prevent the study app from opening.
        }
        refreshConsentState()
    }

    func showPrivacyOptions() async {
        do {
            try await ConsentForm.presentPrivacyOptionsForm(from: nil)
        } catch {
            // Keep the app usable if the privacy form is temporarily unavailable.
        }
        refreshConsentState()
    }

    private func refreshConsentState() {
        privacyOptionsRequired = ConsentInformation.shared.privacyOptionsRequirementStatus == .required
        canRequestAds = ConsentInformation.shared.canRequestAds
        if canRequestAds && !adsStarted {
            adsStarted = true
            MobileAds.shared.start()
        }
    }
}

struct SettingsView: View {
    @ObservedObject var ads: PrivacyAdsModel
    @Environment(\.dismiss) private var dismiss
    @AppStorage("jlptDailyReminderEnabled") private var reminderEnabled = false
    @AppStorage("jlptDailyReminderHour") private var reminderHour = 20
    @AppStorage("jlptDailyReminderMinute") private var reminderMinute = 0

    private var reminderTime: Binding<Date> {
        Binding(
            get: {
                Calendar.current.date(from: DateComponents(hour: reminderHour, minute: reminderMinute)) ?? Date()
            },
            set: { newValue in
                let c = Calendar.current.dateComponents([.hour, .minute], from: newValue)
                reminderHour = c.hour ?? 20
                reminderMinute = c.minute ?? 0
                if reminderEnabled { scheduleReminder() }
            }
        )
    }

    var body: some View {
        NavigationView {
            Form {
                Section("每日學習") {
                    Toggle("每日提醒", isOn: Binding(
                        get: { reminderEnabled },
                        set: { enabled in
                            reminderEnabled = enabled
                            if enabled { requestAndScheduleReminder() }
                            else { cancelReminder() }
                        }
                    ))
                    if reminderEnabled {
                        DatePicker("提醒時間", selection: reminderTime, displayedComponents: .hourAndMinute)
                    }
                }

                if ads.privacyOptionsRequired {
                    Section("廣告與隱私") {
                        Button("管理廣告隱私選項") {
                            Task { await ads.showPrivacyOptions() }
                        }
                    }
                }

                Section("資訊") {
                    Link("隱私權政策", destination: URL(string: "https://jlpt-study-lab.vercel.app/privacy.html")!)
                    Link("網站版", destination: shareURL)
                    Text("版本 1.3.0")
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("設定")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成") { dismiss() }
                }
            }
        }
    }

    private func requestAndScheduleReminder() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, _ in
            if granted { scheduleReminder() }
        }
    }

    private func scheduleReminder() {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: ["jlpt-daily-study"])
        let content = UNMutableNotificationContent()
        content.title = "JLPT Study Lab"
        content.body = "今天也完成一輪日語練習吧。"
        content.sound = .default
        let trigger = UNCalendarNotificationTrigger(
            dateMatching: DateComponents(hour: reminderHour, minute: reminderMinute),
            repeats: true)
        center.add(UNNotificationRequest(identifier: "jlpt-daily-study", content: content, trigger: trigger))
    }

    private func cancelReminder() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["jlpt-daily-study"])
    }
}

struct JLPTWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.websiteDataStore = .default()

        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "nativeTTS")
        let bridge = #"""
        document.addEventListener('click', function(ev) {
          const b = ev.target && ev.target.closest ? ev.target.closest('button[data-speak]') : null;
          if (!b) return;
          ev.preventDefault();
          ev.stopImmediatePropagation();
          const level = localStorage.getItem('jlpt-selected-level-v2') || 'N3';
          window.webkit.messageHandlers.nativeTTS.postMessage({text: String(b.dataset.speak || ''), level: level});
        }, true);
        """#
        controller.addUserScript(WKUserScript(source: bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController = controller

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.keyboardDismissMode = .interactive
        webView.customUserAgent = "JLPTStudyLabiOS/1.3"
        webView.load(URLRequest(url: studyURL, cachePolicy: .reloadRevalidatingCacheData))
        context.coordinator.webView = webView
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "nativeTTS")
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        weak var webView: WKWebView?
        private let speaker = AVSpeechSynthesizer()

        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard message.name == "nativeTTS",
                  let body = message.body as? [String: Any],
                  let text = body["text"] as? String,
                  !text.isEmpty else { return }
            let level = (body["level"] as? String) ?? "N3"
            speaker.stopSpeaking(at: .immediate)
            let utterance = AVSpeechUtterance(string: text)
            utterance.voice = AVSpeechSynthesisVoice(language: "ja-JP")
            let natural = AVSpeechUtteranceDefaultSpeechRate
            utterance.rate = (level == "N5" || level == "N4") ? natural * 0.92 : natural
            utterance.pitchMultiplier = 1.0
            speaker.speak(utterance)
        }

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
        BannerViewContainer()
            .frame(width: 320, height: 50)
            .frame(maxWidth: .infinity)
            .background(Color(uiColor: .systemBackground))
    }
}

private struct BannerViewContainer: UIViewRepresentable {
    func makeUIView(context: Context) -> BannerView {
        let banner = BannerView(adSize: AdSizeBanner)
        banner.adUnitID = "ca-app-pub-3086163657339958/7163193153"
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            banner.rootViewController = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController
        }
        banner.load(Request())
        return banner
    }

    func updateUIView(_ uiView: BannerView, context: Context) {}
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
