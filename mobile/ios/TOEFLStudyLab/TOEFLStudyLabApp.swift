import SwiftUI

@main
struct TOEFLStudyLabApp: App {
    var body: some Scene {
        WindowGroup {
            StudyWebView()
                .ignoresSafeArea(.container, edges: .bottom)
        }
    }
}
