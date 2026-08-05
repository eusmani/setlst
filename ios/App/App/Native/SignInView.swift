import SwiftUI

/// Native sign-in. Sign-up stays on the web for now (it's a multi-step wizard
/// that also records EULA acceptance), so this hands off to it rather than
/// duplicating that flow — and duplicating it wrongly is exactly what broke
/// signup once already.
struct SignInView: View {
    @EnvironmentObject private var auth: AuthStore
    @State private var identifier = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error: String?
    @State private var showingSignUp = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            Wordmark()
            Text("Track, rate & discuss the music you love.")
                .font(.system(size: 14))
                .foregroundStyle(Theme.secondary)
                .padding(.top, 6)

            VStack(spacing: 12) {
                field("Email, username or phone", text: $identifier, secure: false)
                field("Password", text: $password, secure: true)

                if let error {
                    Text(error)
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.danger)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task { await submit() }
                } label: {
                    Group {
                        if busy { ProgressView().tint(Color(hex: 0x111111)) }
                        else { Text("Sign in").font(.system(size: 15, weight: .bold)) }
                    }
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .background(RoundedRectangle(cornerRadius: 14).fill(Theme.accent))
                    .foregroundStyle(Color(hex: 0x1A1408))
                }
                .disabled(busy || identifier.isEmpty || password.isEmpty)
                .opacity(identifier.isEmpty || password.isEmpty ? 0.5 : 1)
            }
            .padding(.top, 28)
            .padding(.horizontal, 28)

            Button("Create an account") { showingSignUp = true }
                .font(.system(size: 14))
                .foregroundStyle(Theme.accent)
                .padding(.top, 18)

            Spacer()
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.background)
        .fullScreenCover(isPresented: $showingSignUp) {
            NavigationStack {
                WebScreen(path: "/register")
                    .ignoresSafeArea()
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Done") {
                                showingSignUp = false
                                Task { await auth.refresh() } // pick up a session made on the web
                            }
                        }
                    }
            }
            .tint(Theme.accent)
        }
    }

    private func field(_ placeholder: String, text: Binding<String>, secure: Bool) -> some View {
        Group {
            if secure {
                SecureField(placeholder, text: text)
            } else {
                TextField(placeholder, text: text)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.emailAddress)
            }
        }
        .padding(.horizontal, 14)
        .frame(height: 48)
        .background(RoundedRectangle(cornerRadius: 12).fill(Theme.surfaceRaised))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border))
        .foregroundStyle(Theme.primary)
    }

    private func submit() async {
        busy = true
        error = nil
        do {
            try await auth.signIn(identifier: identifier, password: password)
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "Couldn't sign you in."
        }
        busy = false
    }
}
