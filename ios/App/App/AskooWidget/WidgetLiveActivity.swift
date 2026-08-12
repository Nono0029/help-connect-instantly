import WidgetKit
import SwiftUI

// MARK: - Live Activity (Dynamic Island / écran verrouillé)
struct MissionLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MissionAttributes.self) { context in
            LiveActivityView(context: context)
                .activityBackgroundTint(Color(red: 0.12, green: 0.25, blue: 0.19).opacity(0.9))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "hand.raised.fill")
                        .foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.titre)
                        .font(.system(size: 12, weight: .bold))
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 4) {
                        HStack(spacing: 6) {
                            Text(statusText(context.state.statut))
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(.white.opacity(0.9))
                            Spacer()
                            ElapsedTimerText(debut: context.attributes.debut)
                        }
                        MissionProgressBar(debut: context.attributes.debut, statut: context.state.statut)
                    }
                }
            } compactLeading: {
                Image(systemName: "hand.raised.fill")
                    .foregroundStyle(.white)
            } compactTrailing: {
                ElapsedTimerText(debut: context.attributes.debut)
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundStyle(.white)
            } minimal: {
                Image(systemName: iconName(context.state.statut))
                    .foregroundStyle(.white)
            }
            .widgetURL(URL(string: "askoo://chat"))
        }
    }

    private func statusText(_ statut: String) -> String {
        switch statut {
        case "terminee": return "Mission terminée 🎉"
        default: return "Mission en cours · sois visible"
        }
    }

    private func iconName(_ statut: String) -> String {
        switch statut {
        case "terminee": return "checkmark.circle.fill"
        default: return "dot.radiowaves.left.and.right"
        }
    }
}

// MARK: - Timer écoulé (textes monospacés pour éviter le tremblement)
private struct ElapsedTimerText: View {
    let debut: Date

    var body: some View {
        Text(timerInterval: debut...Date(), countsDown: false, showsHours: true)
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(.white.opacity(0.95))
    }
}

// MARK: - Barre de progression (remplit sur 60 min)
private struct MissionProgressBar: View {
    let debut: Date
    let statut: String

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color.white.opacity(0.18))
                Capsule()
                    .fill(
                        AnyShapeStyle(
                            statut == "terminee"
                            ? Color.white.opacity(0.9)
                            : LinearGradient(colors: [.white.opacity(0.95), .white.opacity(0.7)], startPoint: .leading, endPoint: .trailing)
                        )
                    )
                    .frame(width: geo.size.width * progress)
            }
        }
        .frame(height: 4)
    }

    private var progress: CGFloat {
        let elapsed = Date().timeIntervalSince(debut)
        return max(0, min(1, elapsed / 3600)) // 100 % après 1 h de mission
    }
}

private struct LiveActivityView: View {
    let context: ActivityViewContext<MissionAttributes>

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                Image(systemName: "hand.raised.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(.white)
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.titre)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text(context.state.statut == "terminee" ? "Mission terminée 🎉" : "Mission en cours · garde un œil ici")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.white.opacity(0.85))
                        .lineLimit(1)
                }
                Spacer()
                ElapsedTimerText(debut: context.attributes.debut)
            }
            MissionProgressBar(debut: context.attributes.debut, statut: context.state.statut)
        }
        .padding(14)
    }
}