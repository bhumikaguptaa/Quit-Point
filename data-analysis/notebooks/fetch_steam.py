"""
Pull real global achievement-percentage data from Steam's public API
(no key required) for a deliberately spread set of games: long open-world,
mid-length linear narrative, and short/indie.

Endpoint: ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002
Docs: https://developer.valvesoftware.com/wiki/Steam_Web_API

We do NOT have human-readable achievement names (that needs GetSchemaForGame,
which requires an API key gated behind Steam Guard Mobile Authenticator --
unavailable right now). So our completion proxy is purely statistical:

  rarest_achievement_pct = min(percent) across all achievements for that game

This is an honest, precisely-defined stat ("the percentage of players who
have the single rarest achievement in this game") rather than a claimed
"finished the game" rate, which would require editorial judgment about
which achievement name maps to story completion.
"""
import json
import time
import urllib.request

GAMES = {
    "Starfield": 1716740,
    "Assassin's Creed Valhalla": 2208920,
    "Elden Ring": 1245620,
    "Hades": 1145360,
    "Disco Elysium - The Final Cut": 632470,
    "Firewatch": 383870,
    "INSIDE": 304430,
    "A Short Hike": 1055540,
    "Cyberpunk 2077": 1091500,
    "The Last of Us Part II Remastered": 2531310,
}

API_URL = (
    "http://api.steampowered.com/ISteamUserStats/"
    "GetGlobalAchievementPercentagesForApp/v0002/?gameid={appid}&format=json"
)


def fetch_game(appid: int) -> list[dict]:
    with urllib.request.urlopen(API_URL.format(appid=appid), timeout=15) as resp:
        data = json.load(resp)
    return data.get("achievementpercentages", {}).get("achievements", [])


def main():
    results = {}
    for name, appid in GAMES.items():
        achievements = fetch_game(appid)
        percents = [float(a["percent"]) for a in achievements]
        if not percents:
            print(f"{name}: NO DATA (appid {appid})")
            continue

        results[name] = {
            "appid": appid,
            "n_achievements": len(percents),
            "rarest_pct": min(percents),
            "most_common_pct": max(percents),
            "median_pct": sorted(percents)[len(percents) // 2],
            "all_percents": sorted(percents),
        }
        print(f"{name}: {len(percents)} achievements, rarest={min(percents):.1f}%, "
              f"median={results[name]['median_pct']:.1f}%")
        time.sleep(1)  # be polite to the public API

    with open("../output/steam_achievements.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\nsaved to ../output/steam_achievements.json")


if __name__ == "__main__":
    main()
