import WidgetKit
import SwiftUI
import ActivityKit

// MARK: - Attributes partagés avec l'app (Live Activity)
public struct MissionAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var statut: String
        public var updatedAt: Double
        public init(statut: String, updatedAt: Double) {
            self.statut = statut
            self.updatedAt = updatedAt
        }
    }
    public var titre: String
    public var missionId: String
    public var debut: Date

    public init(titre: String, missionId: String, debut: Date = Date()) {
        self.titre = titre
        self.missionId = missionId
        self.debut = debut
    }

    private enum CodingKeys: String, CodingKey {
        case titre, missionId, debut
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        titre = try c.decode(String.self, forKey: .titre)
        missionId = try c.decodeIfPresent(String.self, forKey: .missionId) ?? ""
        debut = try c.decodeIfPresent(Date.self, forKey: .debut) ?? Date()
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(titre, forKey: .titre)
        try c.encode(missionId, forKey: .missionId)
        try c.encode(debut, forKey: .debut)
    }
}

// MARK: - Données du widget communautaire (REST Supabase, clé anon publique)
struct DemandeEntry: Codable, Identifiable {
    let id: Int
    let titre: String
}

struct AskooEntry: TimelineEntry {
    let date: Date
    let demandes: [DemandeEntry]
    let error: String?
}

struct AskooProvider: TimelineProvider {
    private let supabaseURL = "https://tdymtslljytdihkblvwu.supabase.co"
    private let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeW10c2xsanl0ZGloa2Jsdnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTQyMzgsImV4cCI6MjA5MTY3MDIzOH0.nWLKkZ8_0m3TFXPQs2VRgRpkUmM4ZP8PUPyRIVyWlis"

    func placeholder(in context: Context) -> AskooEntry {
        AskooEntry(date: Date(), demandes: [], error: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (AskooEntry) -> Void) {
        completion(AskooEntry(date: Date(), demandes: [], error: nil))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<AskooEntry>) -> Void) {
        Task {
            var demandes: [DemandeEntry] = []
            var errorMessage: String? = nil
            do {
                var request = URLRequest(url: URL(string: "\(supabaseURL)/rest/v1/demandes?select=id,titre&order=created_at.desc&limit=5")!)
                request.setValue(anonKey, forHTTPHeaderField: "apikey")
                request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
                request.setValue("application/json", forHTTPHeaderField: "Accept")
                let (data, _) = try await URLSession.shared.data(for: request)
                demandes = try JSONDecoder().decode([DemandeEntry].self, from: data)
            } catch {
                errorMessage = String(describing: error)
            }
            let entry = AskooEntry(date: Date(), demandes: demandes, error: errorMessage)
            let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60)))
            completion(timeline)
        }
    }
}

// MARK: - Vues
struct AskooWidgetView: View {
    @Environment(\.widgetFamily) var family
    var entry: AskooEntry

    var body: some View {
        let gradient = LinearGradient(colors: [Color(red: 0.24, green: 0.48, blue: 0.33), Color(red: 0.12, green: 0.25, blue: 0.19)], startPoint: .top, endPoint: .bottom)

        Group {
            switch family {
            case .systemSmall:
                small
            case .systemLarge:
                large
            default:
                medium
            }
        }
        .foregroundStyle(.white)
        .background(gradient)
    }

    var small: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Askoo")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                Spacer()
                Image(systemName: "hand.raised.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.9))
            }
            Spacer()
            Text("\(entry.demandes.count)")
                .font(.system(size: 32, weight: .black, design: .rounded))
            Text(entry.demandes.count > 0 ? "demandes d'entraide en cours" : "demande d'entraide en cours")
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(.white.opacity(0.85))
        }
        .padding(14)
        .widgetURL(URL(string: "askoo://feed"))
    }

    var medium: some View {
        VStack(alignment: .leading, spacing: 8) {
            header
            if entry.demandes.isEmpty {
                Text("Aucune demande pour le moment.\nReviens vite, les voisins ont besoin de toi.")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white.opacity(0.9))
                    .lineLimit(2)
                    .widgetURL(URL(string: "askoo://feed"))
            } else {
                ForEach(Array(entry.demandes.prefix(3))) { d in
                    Link(destination: URL(string: "askoo://demande/\(d.id)")!) {
                        row(d)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .widgetURL(URL(string: "askoo://feed"))
    }

    var large: some View {
        VStack(alignment: .leading, spacing: 8) {
            header
            if entry.demandes.isEmpty {
                Spacer()
                Text("Aucune demande pour le moment.\nReviens vite, les voisins ont besoin de toi.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.white.opacity(0.9))
                    .frame(maxWidth: .infinity, alignment: .center)
                    .widgetURL(URL(string: "askoo://feed"))
                Spacer()
            } else {
                ForEach(Array(entry.demandes.prefix(6))) { d in
                    Link(destination: URL(string: "askoo://demande/\(d.id)")!) {
                        row(d)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(16)
        .widgetURL(URL(string: "askoo://feed"))
    }

    private var header: some View {
        HStack {
            Text("Askoo")
                .font(.system(size: 14, weight: .black, design: .rounded))
            Spacer()
            Text("\(entry.demandes.count) demandes près de toi")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.white.opacity(0.9))
        }
    }

    private func row(_ d: DemandeEntry) -> some View {
        HStack(spacing: 8) {
            Circle()
                .fill(.white.opacity(0.2))
                .frame(width: 5, height: 5)
            Text(d.titre)
                .font(.system(size: 11, weight: .semibold))
                .lineLimit(1)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(.white.opacity(0.6))
        }
        .padding(.vertical, 1)
    }
}

@main
struct AskooWidgetBundle: WidgetBundle {
    var body: some Widget {
        AskooFeedWidget()
        MissionLiveActivity()
    }
}

struct AskooFeedWidget: Widget {
    let kind = "AskooFeedWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: AskooProvider()) { entry in
            AskooWidgetView(entry: entry)
        }
        .configurationDisplayName("Askoo")
        .description("Les demandes d'entraide près de chez toi.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
