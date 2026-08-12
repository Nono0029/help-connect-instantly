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

    init(titre: String, missionId: String) {
        self.titre = titre
        self.missionId = missionId
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