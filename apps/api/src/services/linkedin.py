"""LinkedIn scraper service — wraps the hosted LinkedIn MCP server."""

import os

import httpx

LINKEDIN_SCRAPER_URL = os.getenv("LINKEDIN_SCRAPER_URL", "http://localhost:8001")


async def scrape_linkedin_profile(linkedin_url: str) -> dict:
    """Scrape a LinkedIn profile via the hosted MCP server wrapper.

    Falls back to mock data if the scraper isn't running.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{LINKEDIN_SCRAPER_URL}/scrape",
                json={"linkedin_url": linkedin_url},
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"[LINKEDIN] Scraper unavailable, using mock: {e}")
        return _mock_profile(linkedin_url)


def _mock_profile(url: str) -> dict:
    """Generate plausible mock LinkedIn data for demo."""
    slug = url.rstrip("/").split("/")[-1].replace("-", " ").title()

    return {
        "name": slug if slug and len(slug) > 2 else "Alex Johnson",
        "headline": "VP of Product | Building the Future of Work",
        "location": "San Francisco Bay Area",
        "summary": (
            "Product leader with 12+ years of experience in B2B SaaS. "
            "Passionate about AI-driven workflows and team dynamics. "
            "Previously led product at TechCorp (Series C, $200M ARR). "
            "Speaker at SaaStr, Product-Led Summit."
        ),
        "experience": [
            {
                "title": "VP of Product",
                "company": "TechCorp",
                "duration": "2022 - Present",
                "description": "Leading product strategy and 40-person product org.",
            },
            {
                "title": "Director of Product",
                "company": "DataFlow Inc",
                "duration": "2019 - 2022",
                "description": "Built enterprise analytics platform from 0 to $50M ARR.",
            },
            {
                "title": "Senior Product Manager",
                "company": "StartupXYZ",
                "duration": "2016 - 2019",
                "description": "Led core platform team, shipped V2 product.",
            },
        ],
        "skills": [
            "Product Strategy",
            "Go-to-Market",
            "Team Leadership",
            "Data Analytics",
            "Enterprise SaaS",
            "AI/ML Applications",
        ],
        "education": [
            {
                "school": "Stanford University",
                "degree": "MBA",
                "year": "2016",
            },
            {
                "school": "UC Berkeley",
                "degree": "BS Computer Science",
                "year": "2012",
            },
        ],
        "source_url": url,
    }


def infer_drives_from_linkedin(profile: dict) -> dict:
    """Infer DECF drive signals from LinkedIn profile data.

    Simplified heuristic for demo. Production uses full inference engine.
    """
    signals = {
        "dominance": 5.0,
        "extraversion": 5.0,
        "patience": 5.0,
        "formality": 5.0,
    }

    headline = (profile.get("headline") or "").lower()
    skills = [s.lower() for s in profile.get("skills", [])]
    experience = profile.get("experience", [])

    leadership_keywords = ["vp", "director", "head", "chief", "founder", "ceo", "cto", "lead"]
    if any(kw in headline for kw in leadership_keywords):
        signals["dominance"] = min(10, signals["dominance"] + 3)

    if len(experience) >= 3:
        signals["patience"] = max(1, signals["patience"] - 2)

    people_keywords = ["team", "leadership", "management", "speaking", "sales", "marketing"]
    people_score = sum(1 for s in skills if any(kw in s for kw in people_keywords))
    if people_score >= 2:
        signals["extraversion"] = min(10, signals["extraversion"] + 3)

    formal_keywords = ["analytics", "data", "compliance", "risk", "legal", "finance", "audit"]
    formal_score = sum(1 for s in skills if any(kw in s for kw in formal_keywords))
    if formal_score >= 2:
        signals["formality"] = min(10, signals["formality"] + 3)

    if "strategy" in headline or "strategic" in headline:
        signals["dominance"] = min(10, signals["dominance"] + 1)
        signals["formality"] = min(10, signals["formality"] + 1)

    return signals
