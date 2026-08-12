import Capacitor
import ActivityKit

// MARK: - Attributes partagés avec le widget
// DOIT être identique (noms + champs) à MissionAttributes dans AskooWidget/AskooWidget.swift
struct MissionAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var statut: String
        var updatedAt: Double
        init(statut: String, updatedAt: Double) {
            self.statut = statut
            self.updatedAt = updatedAt
        }
    }
    var titre: String
    var missionId: String
    var debut: Date

    init(titre: String, missionId: String, debut: Date = Date()) {
        self.titre = titre
        self.missionId = missionId
        self.debut = debut
    }

    private enum CodingKeys: String, CodingKey {
        case titre, missionId, debut
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        titre = try c.decode(String.self, forKey: .titre)
        missionId = try c.decodeIfPresent(String.self, forKey: .missionId) ?? ""
        debut = try c.decodeIfPresent(Date.self, forKey: .debut) ?? Date()
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(titre, forKey: .titre)
        try c.encode(missionId, forKey: .missionId)
        try c.encode(debut, forKey: .debut)
    }
}

@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPInstancePlugin {

    private var activity: Activity<MissionAttributes>?

    @objc func start(_ call: CAPPluginCall) {
        guard let titre = call.getString("titre"), !titre.isEmpty else {
            call.reject("titre requis")
            return
        }
        let missionId = call.getString("missionId") ?? ""

        if #available(iOS 16.2, *) {
            let attributes = MissionAttributes(titre: titre, missionId: missionId)
            let state = MissionAttributes.ContentState(statut: "en_cours", updatedAt: Date().timeIntervalSince1970)
            do {
                let activity = try Activity<MissionAttributes>.request(
                    attributes: attributes,
                    contentState: state,
                    pushType: nil
                )
                self.activity = activity
                call.resolve(["activityId": activity.id])
            } catch {
                call.reject("Impossible de démarrer la Live Activity : \(error.localizedDescription)")
            }
        } else {
            call.reject("Live Activities non supportées sur cet iOS")
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        let statut = call.getString("statut") ?? "en_cours"
        if #available(iOS 16.2, *) {
            guard let activity = self.activity ?? Activity<MissionAttributes>.activities.first else {
                call.reject("Aucune Live Activity active")
                return
            }
            Task {
                await activity.update(
                    ActivityContent<MissionAttributes.ContentState>(
                        state: MissionAttributes.ContentState(
                            statut: statut,
                            updatedAt: Date().timeIntervalSince1970
                        ),
                        staleDate: nil
                    )
                )
                call.resolve()
            }
        } else {
            call.reject("Live Activities non supportées sur cet iOS")
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            let target = self.activity ?? Activity<MissionAttributes>.activities.first
            self.activity = nil
            guard let activity = target else {
                call.resolve()
                return
            }
            Task {
                await activity.end(
                    ActivityContent<MissionAttributes.ContentState>(
                        state: MissionAttributes.ContentState(
                            statut: "terminee",
                            updatedAt: Date().timeIntervalSince1970
                        ),
                        staleDate: nil
                    ),
                    dismissalPolicy: .immediate
                )
                call.resolve()
            }
        } else {
            call.resolve()
        }
    }
}