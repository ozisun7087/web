import SwiftUI
import GoogleMobileAds

struct RootView: View {
    @StateObject private var consent = AdConsentManager.shared

    var body: some View {
        GeometryReader { geometry in
            let bannerWidth = max(320, geometry.size.width)
            let adSize = largeAnchoredAdaptiveBanner(width: bannerWidth)

            VStack(spacing: 0) {
                StudyWebView()

                if consent.privacyOptionsRequired {
                    Button("隱私權選項") {
                        Task { await consent.presentPrivacyOptions() }
                    }
                    .font(.caption)
                    .foregroundStyle(Color(red: 49/255, green: 87/255, blue: 213/255))
                    .padding(.vertical, 6)
                    .frame(maxWidth: .infinity)
                    .background(Color.white)
                }

                if consent.canRequestAds {
                    AdMobBannerView(adSize: adSize)
                        .frame(width: adSize.size.width, height: adSize.size.height)
                        .frame(maxWidth: .infinity)
                        .background(Color.white)
                }
            }
            .task {
                await consent.gatherConsent()
            }
        }
        .background(Color.white)
    }
}
