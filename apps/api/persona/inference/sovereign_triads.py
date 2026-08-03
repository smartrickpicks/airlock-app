"""
Sovereign Triads — Compute optimal 3-profile compositions.

Uses sovereign-balance.yaml's mean-centered DECF math extended to triads.
Scores by: (1) imbalance magnitude (lower=better), (2) energy preservation
(E mean > 5.5), (3) meta-archetype diversity (all 3 represented = bonus).

Composite score = (1 / (1 + imbalance)) * (E_mean / 5.5, capped 1.5) * (1 + 0.2 * meta_count)
"""
import math
import yaml
from itertools import combinations
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
MIDPOINT = 5.5

META_ARCHETYPES = {
    "driver": {"captain", "maverick", "persuader", "promoter", "venturer", "controller", "strategist"},
    "enforcer": {"analyzer", "specialist", "guardian", "operator", "scholar", "controller"},
    "interpreter": {"altruist", "collaborator", "adapter", "artisan", "individualist", "promoter"},
}


def load_profiles() -> dict:
    path = REPO_ROOT / "inference" / "profile-matching.yaml"
    with open(path) as f:
        data = yaml.safe_load(f)
    return data["profiles"]


def compute_triad_balance(drives_list: list[dict]) -> float:
    n = len(drives_list)
    mean_d = sum(d["D"] for d in drives_list) / n
    mean_e = sum(d["E"] for d in drives_list) / n
    mean_c = sum(d["C"] for d in drives_list) / n
    mean_f = sum(d["F"] for d in drives_list) / n
    imbalance = [mean_d - MIDPOINT, mean_e - MIDPOINT, mean_c - MIDPOINT, mean_f - MIDPOINT]
    return math.sqrt(sum(x ** 2 for x in imbalance))


def compute_energy_preservation(drives_list: list[dict]) -> float:
    return sum(d["E"] for d in drives_list) / len(drives_list)


def _get_meta_archetypes(profile_names: tuple[str, ...]) -> set[str]:
    metas = set()
    for name in profile_names:
        for meta, members in META_ARCHETYPES.items():
            if name in members:
                metas.add(meta)
    return metas


def rank_triads(min_size: int = 2, max_size: int = 3) -> list[dict]:
    profiles = load_profiles()
    names = list(profiles.keys())
    results = []

    for combo in combinations(names, max_size):
        drives = [profiles[n] for n in combo]
        imbalance = compute_triad_balance(drives)
        e_mean = compute_energy_preservation(drives)
        metas = _get_meta_archetypes(combo)

        # Composite: balance quality * energy factor * diversity bonus
        balance_score = 1.0 / (1.0 + imbalance)
        e_factor = min(e_mean / MIDPOINT, 1.5)  # Reward E above midpoint, cap at 1.5x
        diversity_factor = 1.0 + (0.2 * len(metas))  # 1.2 for 1, 1.4 for 2, 1.6 for 3

        composite = balance_score * e_factor * diversity_factor

        mean_d = sum(d["D"] for d in drives) / len(drives)
        mean_e = sum(d["E"] for d in drives) / len(drives)
        mean_c = sum(d["C"] for d in drives) / len(drives)
        mean_f = sum(d["F"] for d in drives) / len(drives)

        results.append({
            "profiles": list(combo),
            "mean_decf": {"D": round(mean_d, 2), "E": round(mean_e, 2),
                          "C": round(mean_c, 2), "F": round(mean_f, 2)},
            "imbalance_magnitude": round(imbalance, 3),
            "e_mean": round(e_mean, 2),
            "meta_archetype_count": len(metas),
            "meta_archetypes": sorted(metas),
            "composite_score": round(composite, 4),
        })

    results.sort(key=lambda x: x["composite_score"], reverse=True)
    return results


def get_top_triads(n: int = 10) -> list[dict]:
    return rank_triads()[:n]


if __name__ == "__main__":
    print("=== Top 20 Sovereign Triads ===\n")
    for i, t in enumerate(get_top_triads(20), 1):
        profiles = ", ".join(t["profiles"])
        decf = t["mean_decf"]
        print(f"{i:2d}. [{profiles}]")
        print(f"    DECF: D={decf['D']}, E={decf['E']}, C={decf['C']}, F={decf['F']}")
        print(f"    Balance: {t['imbalance_magnitude']:.3f} | E-preserve: {t['e_mean']:.1f} "
              f"| Metas: {t['meta_archetype_count']} {t['meta_archetypes']}")
        print(f"    Composite: {t['composite_score']:.4f}")
        print()
