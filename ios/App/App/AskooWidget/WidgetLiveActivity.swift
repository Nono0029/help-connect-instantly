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
                    Text(statusText(context.state.statut))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.white.opacity(0.9))
                }
            } compactLeading: {
                Image(systemName: "hand.raised.fill")
                    .foregroundStyle(.white)
            } compactTrailing: {
                Image(systemName: iconName(context.state.statut))
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

private struct LiveActivityView: View {
    let context: ActivityViewContext<MissionAttributes>

    var body: some View {
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
        }
        .padding(14)
    }
}
