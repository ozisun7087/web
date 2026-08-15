import Foundation
import Combine
import GoogleMobileAds
import UserMessagingPlatform

@MainActor
final class AdConsentManager: ObservableObject {
    static let shared = AdConsentManager()

    @Published private(set) var canRequestAds = false
    @Published private(set) var privacyOptionsRequired = false

    private var mobileAdsStarted = false
    private var consentRequestStarted = false

    private init() {}

    func gatherConsent() async {
        guard !consentRequestStarted else { return }
        consentRequestStarted = true

        let parameters = RequestParameters()
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            ConsentInformation.shared.requestConsentInfoUpdate(with: parameters) { _ in
                continuation.resume()
            }
        }

        refreshPrivacyState()
        startAdsIfAllowed()

        do {
            try await ConsentForm.loadAndPresentIfRequired(from: nil)
        } catch {
            // Previous valid consent, if any, can still be used by UMP.
        }

        refreshPrivacyState()
        startAdsIfAllowed()
    }

    func presentPrivacyOptions() async {
        do {
            try await ConsentForm.presentPrivacyOptionsForm(from: nil)
        } catch {
            return
        }
        refreshPrivacyState()
        startAdsIfAllowed()
    }

    private func refreshPrivacyState() {
        privacyOptionsRequired = ConsentInformation.shared.privacyOptionsRequirementStatus == .required
    }

    private func startAdsIfAllowed() {
        guard ConsentInformation.shared.canRequestAds else { return }
        if !mobileAdsStarted {
            mobileAdsStarted = true
            MobileAds.shared.start()
        }
        canRequestAds = true
    }
}
