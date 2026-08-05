import SwiftUI

/// The app's native shell: a real UIKit tab bar (via SwiftUI's `TabView`) that
/// hosts migrated SwiftUI screens alongside the web view for everything not yet
/// rewritten.
///
/// Tabs move from `WebScreen` to native views one at a time as the SwiftUI
/// rewrite proceeds; the tab bar itself, its transitions, and the navigation
/// stacks are native from day one.
struct RootView: View {
    @StateObject private var auth = AuthStore()
    @State private var tab: Tab = .home

    enum Tab: Hashable { case home, albums, add, activity, you }

    var body: some View {
        ZStack {
            switch auth.state {
            case .unknown:
                LaunchPlaceholder()
            case .signedOut:
                SignInView().environmentObject(auth)
            case .signedIn:
                tabs
            }
        }
        .background(Theme.background)
        .preferredColorScheme(.dark)
        .task { await auth.refresh() }
        // Suspended accounts keep read access but are told why posting fails.
        .safeAreaInset(edge: .top) {
            if let notice = auth.suspensionNotice {
                Text(notice)
                    .font(.system(size: 12))
                    .foregroundStyle(Color(hex: 0xFCA5A5))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 16).padding(.vertical, 8)
                    .frame(maxWidth: .infinity)
                    .background(Theme.danger.opacity(0.18))
            }
        }
    }

    private var tabs: some View {
        TabView(selection: $tab) {
            FeedView()
                .environmentObject(auth)
                .tabItem { Label("Home", systemImage: "house") }
                .tag(Tab.home)

            // Not yet migrated — still the web app, inside a native tab.
            WebScreen(path: "/search")
                .ignoresSafeArea()
                .tabItem { Label("Albums", systemImage: "opticaldisc") }
                .tag(Tab.albums)

            WebScreen(path: "/log")
                .ignoresSafeArea()
                .tabItem { Label("Log", systemImage: "plus.circle.fill") }
                .tag(Tab.add)

            WebScreen(path: "/activity")
                .ignoresSafeArea()
                .tabItem { Label("Activity", systemImage: "chart.line.uptrend.xyaxis") }
                .tag(Tab.activity)

            YouView()
                .environmentObject(auth)
                .tabItem { Label("You", systemImage: "person") }
                .tag(Tab.you)
        }
        .tint(Theme.accent)
        .onChange(of: tab) { _, _ in
            // Native tab switches get the same tactile feedback as the rest of iOS.
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }
}

private struct LaunchPlaceholder: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("SETLST")
                .font(Theme.serif(30))
                .foregroundStyle(Theme.accent)
            ProgressView().tint(Theme.accent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.background)
    }
}

/// The "You" tab — native account surface, with the legal and safety links
/// App Review expects to find in-app.
private struct YouView: View {
    @EnvironmentObject private var auth: AuthStore
    @State private var showWeb: String?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 12) {
                        Circle().fill(Theme.surfaceRaised).frame(width: 52, height: 52)
                            .overlay(
                                Text(String(auth.username?.prefix(2).uppercased() ?? "?"))
                                    .font(.system(size: 17, weight: .semibold))
                                    .foregroundStyle(Theme.secondary)
                            )
                        VStack(alignment: .leading, spacing: 2) {
                            Text("@\(auth.username ?? "you")")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(Theme.primary)
                            Text("View your profile")
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.tertiary)
                        }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture { showWeb = "/profile/\(auth.username ?? "")" }
                }
                .listRowBackground(Theme.surface)

                Section("Your library") {
                    row("Diary", "book", "/diary")
                    row("Crates", "square.stack", "/crate")
                    row("Messages", "bubble.left", "/inbox")
                    row("Friends", "person.2", "/members")
                }
                .listRowBackground(Theme.surface)

                Section("Legal & safety") {
                    row("Blocked accounts", "hand.raised", "/settings")
                    row("Terms of Use", "doc.text", "/terms")
                    row("Privacy Policy", "lock", "/privacy")
                    row("Copyright", "c.circle", "/copyright")
                    row("Support", "questionmark.circle", "/support")
                }
                .listRowBackground(Theme.surface)

                Section {
                    Button("Sign out", role: .destructive) { Task { await auth.signOut() } }
                }
                .listRowBackground(Theme.surface)
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle("You")
            .fullScreenCover(item: $showWeb) { path in
                NavigationStack {
                    WebScreen(path: path)
                        .ignoresSafeArea()
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Done") { showWeb = nil }
                            }
                        }
                }
                .tint(Theme.accent)
            }
        }
        .tint(Theme.accent)
    }

    private func row(_ title: String, _ icon: String, _ path: String) -> some View {
        Button { showWeb = path } label: {
            Label(title, systemImage: icon).foregroundStyle(Theme.primary)
        }
    }
}

/// Lets a plain path string drive `.fullScreenCover(item:)`.
extension String: @retroactive Identifiable {
    public var id: String { self }
}
