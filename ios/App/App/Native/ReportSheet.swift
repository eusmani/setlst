import SwiftUI

/// Native reporting and blocking (App Store guideline 1.2).
///
/// Mirrors the web `ReportDialog`/`ContentMenu` pair, including the reason list,
/// so the requirement holds on every screen regardless of whether that screen
/// has been migrated to SwiftUI yet.
struct ReportSheet: View {
    let contentType: String
    let contentId: String
    let authorUsername: String?
    let label: String

    @Environment(\.dismiss) private var dismiss
    @State private var reason: String = ""
    @State private var details: String = ""
    @State private var phase: Phase = .editing
    @State private var error: String?
    @State private var confirmingBlock = false

    private enum Phase { case editing, sending, sent }

    /// Kept in step with `REPORT_REASONS` in `src/lib/reportTypes.ts`.
    private static let reasons: [(value: String, label: String)] = [
        ("spam", "Spam or misleading"),
        ("harassment", "Harassment or bullying"),
        ("hate", "Hate speech or symbols"),
        ("sexual", "Sexually explicit content"),
        ("violence", "Violence or threats"),
        ("self_harm", "Self-harm or suicide"),
        ("copyright", "Copyright or trademark infringement"),
        ("impersonation", "Impersonation"),
        ("other", "Something else"),
    ]

    var body: some View {
        NavigationStack {
            Group {
                if phase == .sent { sentState } else { form }
            }
            .background(Theme.background)
            .navigationTitle(phase == .sent ? "Report received" : "Report \(label)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.tint(Theme.secondary)
                }
                if phase != .sent {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Submit") { Task { await submit() } }
                            .disabled(reason.isEmpty || phase == .sending)
                            .tint(Theme.accent)
                    }
                }
            }
        }
        .tint(Theme.accent)
    }

    private var form: some View {
        Form {
            Section {
                ForEach(Self.reasons, id: \.value) { option in
                    Button {
                        reason = option.value
                    } label: {
                        HStack {
                            Text(option.label).foregroundStyle(Theme.primary)
                            Spacer()
                            if reason == option.value {
                                Image(systemName: "checkmark").foregroundStyle(Theme.accent)
                            }
                        }
                    }
                }
            } header: {
                Text("Why are you reporting this?")
            } footer: {
                Text("SETLST has zero tolerance for objectionable content. Reports are reviewed within 24 hours and offending content and accounts are removed.")
            }
            .listRowBackground(Theme.surface)

            Section("Anything else? (optional)") {
                TextField("Add detail", text: $details, axis: .vertical)
                    .lineLimit(3...6)
                    .foregroundStyle(Theme.primary)
            }
            .listRowBackground(Theme.surface)

            if let error {
                Section { Text(error).foregroundStyle(Theme.danger).font(.system(size: 13)) }
                    .listRowBackground(Theme.surface)
            }
        }
        .scrollContentBackground(.hidden)
    }

    private var sentState: some View {
        VStack(spacing: 14) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 42))
                .foregroundStyle(Theme.accent)
            Text("Thanks — we'll take a look")
                .font(Theme.serif(20))
                .foregroundStyle(Theme.primary)
            Text("Our team reviews every report within 24 hours and removes content that breaks our rules.")
                .font(.system(size: 14))
                .foregroundStyle(Theme.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            if let authorUsername {
                if confirmingBlock {
                    VStack(spacing: 8) {
                        Text("Block @\(authorUsername)? You won't see each other's posts, and they can't message or follow you.")
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                        Button("Block @\(authorUsername)") { Task { await block(authorUsername) } }
                            .foregroundStyle(.white)
                            .padding(.horizontal, 20).padding(.vertical, 10)
                            .background(Capsule().fill(Theme.danger))
                    }
                } else {
                    Button("Block @\(authorUsername)") { confirmingBlock = true }
                        .foregroundStyle(Theme.danger)
                }
            }

            Button("Done") { dismiss() }
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Color(hex: 0x111111))
                .padding(.horizontal, 28).padding(.vertical, 12)
                .background(Capsule().fill(Theme.accent))
                .padding(.top, 6)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func submit() async {
        phase = .sending
        error = nil
        do {
            try await APIClient.shared.report(
                contentType: contentType, contentId: contentId,
                reason: reason, details: details
            )
            phase = .sent
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "Couldn't send that report."
            phase = .editing
        }
    }

    private func block(_ username: String) async {
        try? await APIClient.shared.block(username: username)
        dismiss()
    }
}
