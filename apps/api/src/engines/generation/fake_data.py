"""Seeded, deterministic fake data generator for entertainment contracts.

Produces realistic but entirely fake PII, banking, catalog, and deal data.
No external API calls. Same seed = same corpus, always.
"""

import logging
import random
import string
from datetime import date, timedelta
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Entity name pools
# ---------------------------------------------------------------------------

LABEL_PREFIXES: list[str] = [
    "Crimson",
    "Midnight",
    "Apex",
    "Golden",
    "Silver",
    "Emerald",
    "Obsidian",
    "Neon",
    "Velvet",
    "Iron",
    "Crystal",
    "Shadow",
    "Solar",
    "Lunar",
    "Polar",
    "Nova",
    "Prism",
    "Echo",
    "Horizon",
    "Zenith",
    "Phantom",
    "Coral",
    "Azure",
    "Onyx",
    "Amber",
    "Cobalt",
    "Titan",
    "Vertex",
    "Pulse",
    "Radiant",
    "Sterling",
    "Cedar",
    "Marble",
    "Ivory",
    "Scarlet",
    "Indigo",
    "Sapphire",
    "Granite",
    "Copper",
    "Jade",
    "Opal",
    "Slate",
    "Rustic",
    "Urban",
    "Pacific",
    "Atlantic",
    "Nordic",
    "Alpine",
    "Tropic",
    "Arctic",
    "Summit",
    "Valley",
    "Ridge",
    "Harbor",
]

LABEL_SUFFIXES: list[str] = [
    "Records",
    "Music",
    "Entertainment",
    "Sound",
    "Audio",
    "Media",
    "Recordings",
    "Music Group",
    "Label",
    "Studios",
    "Productions",
    "Collective",
    "Music Co.",
    "Digital",
    "Sonic",
    "Soundworks",
    "Music Inc.",
    "Rhythm",
    "Beat",
    "Groove",
]

STUDIO_PREFIXES: list[str] = [
    "Apex",
    "Pinnacle",
    "Summit",
    "Keystone",
    "Cornerstone",
    "Beacon",
    "Crest",
    "Paramount",
    "Vanguard",
    "Frontier",
    "Gateway",
    "Landmark",
    "Meridian",
    "Compass",
    "Mosaic",
    "Prism",
    "Catalyst",
    "Nexus",
    "Forge",
    "Anvil",
    "Lighthouse",
    "Harbinger",
    "Sentinel",
    "Chronicle",
    "Legacy",
    "Monarch",
    "Equinox",
    "Solstice",
    "Eclipse",
    "Aurora",
    "Spectrum",
    "Starfall",
    "Odyssey",
]

STUDIO_SUFFIXES: list[str] = [
    "Pictures",
    "Films",
    "Cinema Group",
    "Entertainment",
    "Studios",
    "Motion Pictures",
    "Film Group",
    "Productions",
    "Media",
    "Pictures Inc.",
    "Screen Arts",
    "Visual Media",
    "Cinematic",
    "Feature Films",
]

TV_NETWORK_NAMES: list[str] = [
    "Streamline Networks",
    "Cascade Broadcasting",
    "Meridian Media Group",
    "Horizon Television",
    "Summit Broadcasting",
    "Pinnacle TV",
    "Crestview Media",
    "Vanguard Networks",
    "Nexus Broadcasting",
    "Prism Television",
    "Beacon Media Corp",
    "Compass Entertainment Group",
    "Atlas Networks",
    "Zenith Broadcasting",
    "Polaris Television",
    "Equinox Media",
]

FIRST_NAMES: list[str] = [
    "Kai",
    "Elena",
    "Marcus",
    "Aisha",
    "Liam",
    "Yuki",
    "Dante",
    "Priya",
    "Noah",
    "Sofia",
    "Omar",
    "Maya",
    "Ethan",
    "Zara",
    "Leo",
    "Ava",
    "Mateo",
    "Luna",
    "Xavier",
    "Chloe",
    "Ravi",
    "Nora",
    "Jaden",
    "Isla",
    "Diego",
    "Mila",
    "Andre",
    "Freya",
    "Kenji",
    "Layla",
    "Hugo",
    "Amara",
    "Soren",
    "Thalia",
    "Felix",
    "Rosa",
    "Atlas",
    "Vera",
    "Cyrus",
    "Iris",
    "Nico",
    "Sage",
    "Ezra",
    "Dani",
    "Remy",
    "Aria",
    "Theo",
    "Nyla",
    "Milo",
    "Kira",
    "Axel",
    "Jade",
    "Rhys",
    "Tara",
    "Luca",
    "Wren",
    "Rowan",
    "Suki",
    "Cruz",
    "Petra",
    "Beau",
    "Lena",
    "Troy",
    "Ines",
    "Reed",
    "Greta",
    "Cole",
    "Veda",
    "Finn",
    "Anya",
    "Blaze",
    "Yara",
    "Nash",
    "Zuri",
    "Quinn",
    "Esme",
    "Knox",
    "Rio",
    "Juno",
    "Orion",
]

LAST_NAMES: list[str] = [
    "Nakamura",
    "Vasquez",
    "Okafor",
    "Chen",
    "Petrov",
    "Santos",
    "Kim",
    "Larsson",
    "Dubois",
    "Morales",
    "Tanaka",
    "Rivera",
    "Singh",
    "Mueller",
    "Alonso",
    "Park",
    "Novak",
    "Costa",
    "Yamamoto",
    "Mendez",
    "Johansson",
    "Fernandez",
    "Nguyen",
    "Bergstr\u00f6m",
    "Torres",
    "Sato",
    "Volkov",
    "Cruz",
    "Fischer",
    "Rossi",
    "Andersen",
    "Gupta",
    "Hernandez",
    "Watanabe",
    "Leone",
    "Ivanov",
    "Reyes",
    "Suzuki",
    "Becker",
    "Ortiz",
    "Lindgren",
    "Patel",
    "Moreau",
    "Takahashi",
    "Schultz",
    "Vargas",
    "Mori",
    "Jensen",
    "Sousa",
    "Ito",
    "Eriksson",
    "Castillo",
    "Khan",
    "Nilsson",
    "Medina",
    "Hayashi",
    "Weber",
    "Rojas",
    "Kato",
    "Hoffman",
    "Flores",
    "Ueda",
    "Graf",
    "Luna",
]

# ---------------------------------------------------------------------------
# Address pools
# ---------------------------------------------------------------------------

STREET_PREFIXES: list[str] = [
    "100",
    "200",
    "350",
    "500",
    "720",
    "850",
    "1200",
    "1500",
    "1800",
    "2100",
    "2400",
    "2750",
    "3000",
    "3500",
    "4200",
    "4800",
    "5100",
    "5500",
    "6000",
    "7200",
    "8100",
    "9000",
    "9500",
    "10200",
    "11000",
    "12500",
]

STREET_NAMES: list[str] = [
    "Maple Ave",
    "Oak Street",
    "Elm Boulevard",
    "Cedar Lane",
    "Pine Drive",
    "Willow Way",
    "Birch Road",
    "Ash Court",
    "Spruce Terrace",
    "Walnut Place",
    "Market Street",
    "Main Street",
    "Broadway",
    "Park Avenue",
    "Sunset Blvd",
    "Vine Street",
    "Highland Ave",
    "Beverly Drive",
    "Melrose Ave",
    "Ventura Blvd",
    "Commerce Drive",
    "Industrial Parkway",
    "Tech Center Way",
    "Innovation Drive",
]

CITIES: list[tuple[str, str, str]] = [
    ("New York", "NY", "10001"),
    ("Los Angeles", "CA", "90001"),
    ("Nashville", "TN", "37201"),
    ("Atlanta", "GA", "30301"),
    ("Miami", "FL", "33101"),
    ("Chicago", "IL", "60601"),
    ("San Francisco", "CA", "94101"),
    ("Austin", "TX", "73301"),
    ("Seattle", "WA", "98101"),
    ("Denver", "CO", "80201"),
    ("Portland", "OR", "97201"),
    ("Boston", "MA", "02101"),
    ("Philadelphia", "PA", "19101"),
    ("Detroit", "MI", "48201"),
    ("Memphis", "TN", "38101"),
    ("Dallas", "TX", "75201"),
    ("Phoenix", "AZ", "85001"),
    ("Minneapolis", "MN", "55401"),
    ("New Orleans", "LA", "70112"),
    ("Las Vegas", "NV", "89101"),
    ("London", "UK", "EC1A 1BB"),
    ("Toronto", "ON", "M5H 2N2"),
    ("Berlin", "DE", "10115"),
    ("Tokyo", "JP", "100-0001"),
    ("Sydney", "AU", "2000"),
    ("Paris", "FR", "75001"),
    ("Mumbai", "IN", "400001"),
    ("Seoul", "KR", "04524"),
    ("Stockholm", "SE", "111 29"),
    ("Mexico City", "MX", "06600"),
]

# ---------------------------------------------------------------------------
# Catalog pools
# ---------------------------------------------------------------------------

TRACK_ADJECTIVES: list[str] = [
    "Neon",
    "Midnight",
    "Golden",
    "Lost",
    "Electric",
    "Fading",
    "Burning",
    "Frozen",
    "Silent",
    "Echoing",
    "Distant",
    "Crimson",
    "Amber",
    "Velvet",
    "Shattered",
    "Eternal",
    "Hollow",
    "Rising",
    "Falling",
    "Drifting",
    "Radiant",
    "Winding",
    "Sacred",
    "Broken",
    "Wild",
    "Gentle",
    "Fierce",
    "Hidden",
    "Open",
    "Deep",
    "High",
    "Last",
    "First",
    "Endless",
    "Brief",
]

TRACK_NOUNS: list[str] = [
    "Horizon",
    "Dreams",
    "Lights",
    "Rain",
    "Fire",
    "Ocean",
    "Sky",
    "Shadow",
    "Storm",
    "River",
    "Mountain",
    "Roses",
    "Stars",
    "Moon",
    "Heart",
    "Road",
    "Bridge",
    "Mirror",
    "Garden",
    "Canyon",
    "Waves",
    "Echoes",
    "Silence",
    "Thunder",
    "Ashes",
    "Wings",
    "Stones",
    "Flames",
    "Dust",
    "Tide",
    "Bloom",
    "Veil",
    "Maze",
    "Crown",
    "Ghost",
    "Dawn",
]

ALBUM_TEMPLATES: list[str] = [
    "The {} Sessions",
    "{} Chronicles",
    "Songs from {}",
    "After {}",
    "Before the {}",
    "{} & Other Stories",
    "Notes on {}",
    "Return to {}",
    "Beyond the {}",
    "Inside the {}",
    "Across the {}",
    "Under the {}",
]

FILM_ADJECTIVES: list[str] = [
    "Last",
    "Final",
    "Silent",
    "Forgotten",
    "Hidden",
    "Eternal",
    "Broken",
    "Burning",
    "Frozen",
    "Lost",
    "Sacred",
    "Hollow",
    "Distant",
    "Crimson",
    "Golden",
    "Dark",
    "Pale",
    "Wild",
    "Gentle",
    "Fierce",
    "Ancient",
]

FILM_NOUNS: list[str] = [
    "Meridian",
    "Protocol",
    "Witness",
    "Stranger",
    "Compass",
    "Verdict",
    "Chronicle",
    "Covenant",
    "Architect",
    "Beacon",
    "Frontier",
    "Harbor",
    "Kingdom",
    "Labyrinth",
    "Paradox",
    "Requiem",
    "Sanctuary",
    "Tempest",
    "Catalyst",
    "Reckoning",
    "Passage",
    "Cipher",
    "Horizon",
    "Legacy",
]

TV_ADJECTIVES: list[str] = [
    "Harbor",
    "Midnight",
    "Copper",
    "Sterling",
    "Iron",
    "Golden",
    "Silver",
    "Cedar",
    "Marble",
    "Obsidian",
    "Crimson",
    "Azure",
    "Emerald",
    "Amber",
]

TV_NOUNS: list[str] = [
    "Lights",
    "Heights",
    "Falls",
    "Ridge",
    "Creek",
    "Bay",
    "Springs",
    "Crossing",
    "Station",
    "District",
    "Precinct",
    "Division",
    "Bureau",
    "Circle",
    "Lane",
    "Gate",
    "Point",
    "Crest",
    "Vale",
    "Haven",
]

ENTITY_SUFFIXES: list[str] = [
    "LLC",
    "Inc.",
    "Ltd.",
    "Corp.",
    "LLP",
    "Co.",
    "GmbH",
    "S.A.",
    "Pty Ltd",
    "BV",
    "AG",
    "SAS",
    "S.r.l.",
    "PLC",
]

TERRITORIES: list[str] = [
    "Worldwide",
    "North America",
    "United States",
    "Europe",
    "United Kingdom",
    "Asia Pacific",
    "Latin America",
    "EMEA",
    "North America and Europe",
    "United States and Canada",
    "Worldwide excluding China",
    "EU and UK",
]

GOVERNING_LAWS: list[str] = [
    "California",
    "New York",
    "Tennessee",
    "Georgia",
    "Florida",
    "Texas",
    "Illinois",
    "England and Wales",
    "Ontario, Canada",
]

PAYMENT_TERMS: list[str] = ["Net 30", "Net 60", "Net 90", "Quarterly"]
EXCLUSIVITY_OPTIONS: list[str] = ["Yes", "No"]
AUTO_RENEW_OPTIONS: list[str] = ["Yes", "No"]
SYNC_RIGHTS_OPTIONS: list[str] = ["Yes", "No"]
PHYSICAL_DIST_OPTIONS: list[str] = ["Yes", "No"]
OPTION_TYPES: list[str] = ["Album", "Term", "Singles", "No Option"]
PRO_AFFILIATIONS: list[str] = ["ASCAP", "BMI", "SESAC", "PRS", "SOCAN", "GEMA", "SACEM"]

GUILD_AFFILIATIONS: list[str] = ["SAG-AFTRA", "DGA", "WGA", "IATSE", "None"]
BILLING_POSITIONS: list[str] = ["Star", "Featured", "Supporting", "Guest Star", "Day Player"]
MEDIA_SCOPES: list[str] = [
    "All Media",
    "Theatrical Only",
    "Streaming Only",
    "Broadcast Only",
    "Theatrical and Streaming",
    "All Media excluding Theatrical",
]


# ---------------------------------------------------------------------------
# Main faker class
# ---------------------------------------------------------------------------


class EntertainmentFaker:
    """Seeded, deterministic fake data generator for entertainment contracts."""

    def __init__(self, seed: int = 42) -> None:
        self._rng = random.Random(seed)
        self._entity_cache: dict[str, Any] = {}

    def _pick(self, pool: list[Any]) -> Any:
        return self._rng.choice(pool)

    def _pick_n(self, pool: list[Any], n: int) -> list[Any]:
        return [self._rng.choice(pool) for _ in range(n)]

    # -- Entity names -------------------------------------------------------

    def label_name(self) -> str:
        return f"{self._pick(LABEL_PREFIXES)} {self._pick(LABEL_SUFFIXES)}"

    def studio_name(self) -> str:
        return f"{self._pick(STUDIO_PREFIXES)} {self._pick(STUDIO_SUFFIXES)}"

    def tv_network_name(self) -> str:
        return self._pick(TV_NETWORK_NAMES)

    def person_name(self) -> str:
        return f"{self._pick(FIRST_NAMES)} {self._pick(LAST_NAMES)}"

    def artist_name(self) -> str:
        return self.person_name()

    def producer_name(self) -> str:
        return self.person_name()

    def director_name(self) -> str:
        return self.person_name()

    def legal_entity(self, base_name: str | None = None) -> str:
        name = base_name or self.label_name()
        suffix = self._pick(ENTITY_SUFFIXES)
        return f"{name} {suffix}"

    # -- Addresses -----------------------------------------------------------

    def street_address(self) -> str:
        return f"{self._pick(STREET_PREFIXES)} {self._pick(STREET_NAMES)}"

    def city_state_zip(self) -> tuple[str, str, str]:
        return self._pick(CITIES)

    def full_address(self) -> str:
        city, state, zipcode = self.city_state_zip()
        return f"{self.street_address()}, {city}, {state} {zipcode}"

    # -- Banking (valid format, entirely fake) --------------------------------

    def routing_number(self) -> str:
        """Generate a 9-digit ABA routing number with valid check digit."""
        digits = [self._rng.randint(0, 9) for _ in range(8)]
        checksum = (
            3 * (digits[0] + digits[3] + digits[6])
            + 7 * (digits[1] + digits[4] + digits[7])
            + (digits[2] + digits[5])
        ) % 10
        check_digit = (10 - checksum) % 10
        digits.append(check_digit)
        return "".join(str(d) for d in digits)

    def account_number(self) -> str:
        length = self._rng.randint(8, 12)
        return "".join(str(self._rng.randint(0, 9)) for _ in range(length))

    def swift_code(self) -> str:
        bank = "".join(self._rng.choices(string.ascii_uppercase, k=4))
        country = self._pick(["US", "GB", "DE", "FR", "JP", "CA", "AU"])
        loc = "".join(self._rng.choices(string.ascii_uppercase + string.digits, k=2))
        return f"{bank}{country}{loc}"

    # -- Contact info --------------------------------------------------------

    def email(self, name: str | None = None) -> str:
        if name is None:
            name = self.person_name()
        first, last = name.lower().split(" ", 1)
        domain = self._pick(
            [
                "gmail.com",
                "outlook.com",
                "yahoo.com",
                "icloud.com",
                "proton.me",
                "fastmail.com",
                "mail.com",
            ]
        )
        sep = self._pick([".", "_", ""])
        return f"{first}{sep}{last}@{domain}"

    def phone(self) -> str:
        area = self._rng.randint(200, 999)
        mid = self._rng.randint(200, 999)
        last = self._rng.randint(1000, 9999)
        return f"({area}) {mid}-{last}"

    # -- Catalog: Music ------------------------------------------------------

    def track_title(self) -> str:
        return f"{self._pick(TRACK_ADJECTIVES)} {self._pick(TRACK_NOUNS)}"

    def album_title(self) -> str:
        noun = self._pick(TRACK_NOUNS)
        return self._pick(ALBUM_TEMPLATES).format(noun)

    def isrc(self) -> str:
        country = self._pick(["US", "GB", "DE", "FR", "JP", "CA", "AU", "BR"])
        registrant = "".join(self._rng.choices(string.ascii_uppercase + string.digits, k=3))
        year = self._rng.randint(20, 26)
        designation = self._rng.randint(1, 99999)
        return f"{country}-{registrant}-{year:02d}-{designation:05d}"

    def upc(self) -> str:
        return "".join(str(self._rng.randint(0, 9)) for _ in range(12))

    def iswc(self) -> str:
        digits = "".join(str(self._rng.randint(0, 9)) for _ in range(9))
        check = self._rng.randint(0, 9)
        return f"T-{digits}-{check}"

    def ipi_number(self) -> str:
        return "".join(str(self._rng.randint(0, 9)) for _ in range(11))

    # -- Catalog: Film/TV ----------------------------------------------------

    def film_title(self) -> str:
        return f"The {self._pick(FILM_ADJECTIVES)} {self._pick(FILM_NOUNS)}"

    def tv_series(self) -> str:
        return f"{self._pick(TV_ADJECTIVES)} {self._pick(TV_NOUNS)}"

    def episode_title(self) -> str:
        return f"{self._pick(TRACK_ADJECTIVES)} {self._pick(FILM_NOUNS)}"

    # -- Financial -----------------------------------------------------------

    def advance_amount(self, min_val: int = 500, max_val: int = 500_000) -> str:
        amount = self._rng.randint(min_val // 500, max_val // 500) * 500
        return f"{amount:,}"

    def large_advance(self) -> str:
        return self.advance_amount(50_000, 5_000_000)

    def royalty_rate(self, min_val: int = 5, max_val: int = 95) -> str:
        return str(self._rng.randint(min_val, max_val))

    def royalty_split(self) -> str:
        label_share = self._rng.choice([10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 75, 80, 85])
        artist_share = 100 - label_share
        return f"{label_share}/{artist_share}"

    def admin_fee(self) -> str:
        return str(self._rng.choice([5, 8, 10, 12, 15, 18, 20, 25]))

    def day_rate(self) -> str:
        rate = self._rng.randint(2, 200) * 500
        return f"{rate:,}"

    def episode_fee(self) -> str:
        fee = self._rng.randint(10, 1000) * 500
        return f"{fee:,}"

    def backend_points(self) -> str:
        return str(self._rng.choice([1, 2, 2.5, 3, 5, 7.5, 10]))

    # -- Dates ---------------------------------------------------------------

    def effective_date(self, start_year: int = 2020, end_year: int = 2026) -> str:
        start = date(start_year, 1, 1)
        end = date(end_year, 12, 31)
        delta = (end - start).days
        d = start + timedelta(days=self._rng.randint(0, delta))
        return d.strftime("%B %d, %Y")

    def contract_end_date(self) -> str:
        return self.effective_date(2025, 2030)

    def term_length(self) -> str:
        return str(self._rng.choice([1, 2, 3, 5, 7, 10]))

    def renewal_term_length(self) -> str:
        return str(self._rng.choice([1, 2, 3]))

    def termination_period(self) -> str:
        return str(self._rng.choice([30, 60, 90, 120, 180]))

    def sell_off_period(self) -> str:
        return str(self._rng.choice([3, 6, 9, 12, 18, 24]))

    def option_period(self) -> str:
        return str(self._rng.choice([6, 9, 12, 18, 24]))

    def number_of_options(self) -> str:
        return str(self._rng.choice([1, 2, 3, 4]))

    # -- Picklist values -----------------------------------------------------

    def territory(self) -> str:
        return self._pick(TERRITORIES)

    def governing_law(self) -> str:
        return self._pick(GOVERNING_LAWS)

    def payment_terms(self) -> str:
        return self._pick(PAYMENT_TERMS)

    def exclusive(self) -> str:
        return self._pick(EXCLUSIVITY_OPTIONS)

    def auto_renew(self) -> str:
        return self._pick(AUTO_RENEW_OPTIONS)

    def sync_rights(self) -> str:
        return self._pick(SYNC_RIGHTS_OPTIONS)

    def physical_distribution(self) -> str:
        return self._pick(PHYSICAL_DIST_OPTIONS)

    def option_type(self) -> str:
        return self._pick(OPTION_TYPES)

    def pro_affiliation(self) -> str:
        return self._pick(PRO_AFFILIATIONS)

    def guild_affiliation(self) -> str:
        return self._pick(GUILD_AFFILIATIONS)

    def billing_position(self) -> str:
        return self._pick(BILLING_POSITIONS)

    def media_scope(self) -> str:
        return self._pick(MEDIA_SCOPES)

    # -- Full form value generators per contract type ------------------------

    def _base_form_values(self) -> dict[str, str]:
        """Fields common to all contract types."""
        label = self.label_name()
        artist = self.artist_name()
        return {
            "ACCT_LEGAL_ENTITY": self.legal_entity(label),
            "ACCT_COUNTERPARTY": artist,
            "ACCT_BILLING_STREET": self.street_address(),
            "ACCT_BILLING_CITY": self.city_state_zip()[0],
            "ACCT_BILLING_STATE": self.city_state_zip()[1],
            "ACCT_BILLING_ZIP": self.city_state_zip()[2],
            "ACCT_BILLING_COUNTRY": "United States",
            "ACCT_ROUTING_NUMBER": self.routing_number(),
            "ACCT_ACCOUNT_NUMBER": self.account_number(),
            "ACCT_BANK_NAME": f"{self._pick(LABEL_PREFIXES)} National Bank",
            "OPP_EFFECTIVE_DATE": self.effective_date(),
            "OPP_TERRITORY": self.territory(),
            "OPP_TERM_LENGTH": self.term_length(),
            "OPP_GOVERNING_LAW": self.governing_law(),
            "OPP_AUTO_RENEW": self.auto_renew(),
            "OPP_EXCLUSIVE": self.exclusive(),
            "OPP_PAYMENT_TERMS": self.payment_terms(),
            "OPP_TERMINATION_PERIOD": self.termination_period(),
        }

    def generate_form_values(self, contract_type: str) -> dict[str, str]:
        """Generate a complete set of form values for a given contract type."""
        dispatch = {
            "distribution": self._distribution_values,
            "license": self._license_values,
            "recording": self._recording_values,
            "publishing": self._publishing_values,
            "producer": self._producer_values,
            "sync-license": self._sync_license_values,
            "master-use": self._master_use_values,
            "management": self._management_values,
            "co-publishing": self._co_publishing_values,
            "sample-clearance": self._sample_clearance_values,
            "film-distribution": self._film_distribution_values,
            "talent-actor": self._talent_actor_values,
            "director": self._director_values,
            "screenplay-option": self._screenplay_option_values,
            "co-production": self._co_production_values,
            "tv-distribution": self._tv_distribution_values,
            "tv-talent": self._tv_talent_values,
            "tv-development": self._tv_development_values,
            "tv-licensing": self._tv_licensing_values,
            "nda": self._nda_values,
            "work-for-hire": self._work_for_hire_values,
            "assignment": self._assignment_values,
            "termination": self._termination_values,
            "merchandise": self._merchandise_values,
        }
        generator = dispatch.get(contract_type, self._base_form_values)
        values = generator()
        values["OPP_CONTRACT_TYPE"] = contract_type.replace("-", "_").title()
        return values

    # -- Per-type generators ------------------------------------------------

    def _distribution_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v.update(
            {
                "OPP_BACK_CATALOG_RATE": self.royalty_rate(10, 40),
                "OPP_NEW_RELEASE_RATE": self.royalty_rate(15, 50),
                "OPP_ROYALTY_RATE": self.royalty_rate(15, 85),
                "OPP_ADVANCE_AMOUNT": self.advance_amount(),
                "OPP_DISTRIBUTION_SCOPE": "Distribution",
                "OPP_SYNC_RIGHTS": self.sync_rights(),
                "OPP_PHYSICAL_DISTRIBUTION": self.physical_distribution(),
                "OPP_SUBLICENSE": self.exclusive(),
                "OPP_MERCH_RIGHTS": self._pick(["Yes", "No"]),
                "OPP_MECHANICAL_SPLIT": self.royalty_split(),
                "OPP_PERFORMANCE_SPLIT": self.royalty_split(),
                "OPP_SYNC_SPLIT": self.royalty_split(),
                "OPP_ADMIN_FEE": self.admin_fee(),
                "OPP_SELL_OFF_PERIOD": self.sell_off_period(),
                "OPP_RENEWAL_TERM_LENGTH": self.renewal_term_length(),
                "OPP_SYNC_APPROVAL_REQUIRED": self._pick(["Yes", "No"]),
                "OPP_SAMPLE_LICENSING_RESTRICTIONS": self._pick(["Yes", "No"]),
            }
        )
        return v

    def _license_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v.update(
            {
                "OPP_LICENSE_TYPE": self._pick(["Exclusive", "Non-Exclusive", "Co-Exclusive"]),
                "OPP_ROYALTY_RATE": self.royalty_rate(10, 80),
                "OPP_ADVANCE_AMOUNT": self.advance_amount(),
                "OPP_SYNC_RIGHTS": self.sync_rights(),
                "OPP_SUBLICENSE": self._pick(["Yes", "No"]),
                "OPP_SELL_OFF_PERIOD": self.sell_off_period(),
                "OPP_AFFILIATION": self.pro_affiliation(),
            }
        )
        return v

    def _recording_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v.update(
            {
                "OPP_ADVANCE_AMOUNT": self.advance_amount(5000, 500_000),
                "OPP_ROYALTY_RATE": self.royalty_rate(12, 25),
                "OPP_RECORDING_EXCLUSIVITY": self._pick(["Yes", "No"]),
                "OPP_CONTROLLED_COMPOSITION": self._pick(["Yes", "No"]),
                "OPP_OPTION_TYPE": self.option_type(),
                "OPP_NUMBER_OF_OPTIONS": self.number_of_options(),
                "OPP_OPTION_PERIOD": self.option_period(),
                "OPP_CREATIVE_CONTROL": self._pick(["Artist", "Label", "Mutual"]),
                "OPP_SYNC_APPROVAL_REQUIRED": self._pick(["Yes", "No"]),
                "OPP_MERCH_RIGHTS": self._pick(["Yes", "No"]),
            }
        )
        return v

    def _publishing_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v.update(
            {
                "OPP_AFFILIATION": self.pro_affiliation(),
                "OPP_WRITER_IPI_NUMBER": self.ipi_number(),
                "OPP_MECHANICAL_SPLIT": self.royalty_split(),
                "OPP_PERFORMANCE_SPLIT": self.royalty_split(),
                "OPP_SYNC_SPLIT": self.royalty_split(),
                "OPP_ADVANCE_AMOUNT": self.advance_amount(1000, 200_000),
                "OPP_CONTROLLED_COMPOSITION": self._pick(["Yes", "No"]),
                "OPP_PUBLISHING_SHARE": self.royalty_rate(25, 75),
                "OPP_WRITER_SHARE": self.royalty_rate(25, 75),
            }
        )
        return v

    def _producer_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v.update(
            {
                "OPP_ADVANCE_AMOUNT": self.advance_amount(1000, 100_000),
                "OPP_ROYALTY_RATE": self.royalty_rate(2, 10),
                "OPP_PRODUCER_FEE": self.advance_amount(500, 50_000),
                "OPP_CREATIVE_CONTROL": self._pick(["Producer", "Label", "Mutual"]),
                "OPP_RECORDING_EXCLUSIVITY": "No",
            }
        )
        return v

    def _sync_license_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v.update(
            {
                "OPP_SYNC_FEE": self.advance_amount(500, 500_000),
                "OPP_MEDIA_SCOPE": self.media_scope(),
                "OPP_SYNC_APPROVAL_REQUIRED": self._pick(["Yes", "No"]),
                "OPP_LICENSE_TYPE": self._pick(["Exclusive", "Non-Exclusive"]),
                "OPP_SYNC_DURATION": self._pick(["In Perpetuity", "1 Year", "3 Years", "5 Years"]),
            }
        )
        return v

    def _master_use_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v.update(
            {
                "OPP_LICENSE_TYPE": self._pick(["Exclusive", "Non-Exclusive"]),
                "OPP_ROYALTY_RATE": self.royalty_rate(10, 50),
                "OPP_ADVANCE_AMOUNT": self.advance_amount(1000, 100_000),
            }
        )
        return v

    def _management_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v.update(
            {
                "OPP_COMMISSION_RATE": self.royalty_rate(10, 25),
                "OPP_SCOPE_OF_SERVICES": self._pick(
                    [
                        "Full Service",
                        "Touring Only",
                        "Recording Only",
                        "Digital Strategy",
                        "Brand Partnerships",
                    ]
                ),
            }
        )
        return v

    def _co_publishing_values(self) -> dict[str, str]:
        v = self._publishing_values()
        v.update(
            {
                "OPP_CO_PUB_SPLIT": self.royalty_split(),
                "OPP_ADMIN_RIGHTS": self._pick(["Publisher A", "Publisher B", "Shared"]),
            }
        )
        return v

    def _sample_clearance_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v.update(
            {
                "OPP_SAMPLE_FEE": self.advance_amount(500, 50_000),
                "OPP_SAMPLE_ROYALTY": self.royalty_rate(1, 10),
                "OPP_ORIGINAL_TRACK": self.track_title(),
                "OPP_ORIGINAL_ARTIST": self.artist_name(),
            }
        )
        return v

    def _film_distribution_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v["ACCT_LEGAL_ENTITY"] = self.legal_entity(self.studio_name())
        v.update(
            {
                "OPP_FILM_TITLE": self.film_title(),
                "OPP_ADVANCE_AMOUNT": self.large_advance(),
                "OPP_ROYALTY_RATE": self.royalty_rate(15, 50),
                "OPP_MEDIA_SCOPE": self.media_scope(),
                "OPP_BACKEND_POINTS": self.backend_points(),
                "OPP_SELL_OFF_PERIOD": self.sell_off_period(),
            }
        )
        return v

    def _talent_actor_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v["ACCT_LEGAL_ENTITY"] = self.legal_entity(self.studio_name())
        v.update(
            {
                "OPP_FILM_TITLE": self.film_title(),
                "OPP_TALENT_NAME": self.person_name(),
                "OPP_DAY_RATE": self.day_rate(),
                "OPP_GUILD_AFFILIATION": self.guild_affiliation(),
                "OPP_BILLING_POSITION": self.billing_position(),
                "OPP_SCREEN_CREDIT": self._pick(["Yes", "No"]),
                "OPP_BACKEND_POINTS": self.backend_points(),
                "OPP_RESIDUALS": self._pick(["SAG Scale", "Custom", "Buyout"]),
                "OPP_PROMOTIONAL_DAYS": str(self._rng.randint(1, 15)),
            }
        )
        return v

    def _director_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v["ACCT_LEGAL_ENTITY"] = self.legal_entity(self.studio_name())
        v.update(
            {
                "OPP_FILM_TITLE": self.film_title(),
                "OPP_DIRECTOR_NAME": self.director_name(),
                "OPP_DIRECTOR_FEE": self.large_advance(),
                "OPP_GUILD_AFFILIATION": self._pick(["DGA", "None"]),
                "OPP_SCREEN_CREDIT": "Yes",
                "OPP_BACKEND_POINTS": self.backend_points(),
            }
        )
        return v

    def _screenplay_option_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v["ACCT_LEGAL_ENTITY"] = self.legal_entity(self.studio_name())
        v.update(
            {
                "OPP_SCREENPLAY_TITLE": self.film_title(),
                "OPP_WRITER_NAME": self.person_name(),
                "OPP_OPTION_FEE": self.advance_amount(5000, 100_000),
                "OPP_PURCHASE_PRICE": self.large_advance(),
                "OPP_OPTION_PERIOD": self.option_period(),
                "OPP_SCREEN_CREDIT": "Yes",
                "OPP_GUILD_AFFILIATION": self._pick(["WGA", "None"]),
            }
        )
        return v

    def _co_production_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v["ACCT_LEGAL_ENTITY"] = self.legal_entity(self.studio_name())
        v["ACCT_COUNTERPARTY"] = self.legal_entity(self.studio_name())
        v.update(
            {
                "OPP_FILM_TITLE": self.film_title(),
                "OPP_BUDGET_RANGE": self.large_advance(),
                "OPP_CONTRIBUTION_SPLIT": self.royalty_split(),
                "OPP_REVENUE_SPLIT": self.royalty_split(),
            }
        )
        return v

    def _tv_distribution_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v["ACCT_LEGAL_ENTITY"] = self.legal_entity(self.studio_name())
        v["ACCT_COUNTERPARTY"] = self._pick(TV_NETWORK_NAMES)
        v.update(
            {
                "OPP_TV_SERIES": self.tv_series(),
                "OPP_EPISODE_COUNT": str(self._rng.choice([6, 8, 10, 12, 13, 22, 24])),
                "OPP_ADVANCE_AMOUNT": self.large_advance(),
                "OPP_ROYALTY_RATE": self.royalty_rate(20, 60),
                "OPP_MEDIA_SCOPE": self.media_scope(),
            }
        )
        return v

    def _tv_talent_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v["ACCT_LEGAL_ENTITY"] = self.legal_entity(self.studio_name())
        v.update(
            {
                "OPP_TV_SERIES": self.tv_series(),
                "OPP_TALENT_NAME": self.person_name(),
                "OPP_EPISODE_COUNT": str(self._rng.choice([6, 8, 10, 12, 13, 22])),
                "OPP_EPISODE_FEE": self.episode_fee(),
                "OPP_GUILD_AFFILIATION": self.guild_affiliation(),
                "OPP_BILLING_POSITION": self.billing_position(),
                "OPP_SCREEN_CREDIT": self._pick(["Yes", "No"]),
                "OPP_RESIDUALS": self._pick(["SAG Scale", "Custom", "Buyout"]),
            }
        )
        return v

    def _tv_development_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v["ACCT_LEGAL_ENTITY"] = self.legal_entity(self._pick(TV_NETWORK_NAMES))
        v.update(
            {
                "OPP_TV_SERIES": self.tv_series(),
                "OPP_PILOT_BUDGET": self.large_advance(),
                "OPP_SERIES_ORDER": str(self._rng.choice([6, 8, 10, 13])),
                "OPP_EPISODE_FEE": self.episode_fee(),
                "OPP_BACKEND_POINTS": self.backend_points(),
            }
        )
        return v

    def _tv_licensing_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v["ACCT_LEGAL_ENTITY"] = self.legal_entity(self.studio_name())
        v["ACCT_COUNTERPARTY"] = self._pick(TV_NETWORK_NAMES)
        v.update(
            {
                "OPP_TV_SERIES": self.tv_series(),
                "OPP_LICENSE_TYPE": self._pick(["Exclusive", "Non-Exclusive"]),
                "OPP_ADVANCE_AMOUNT": self.large_advance(),
                "OPP_MEDIA_SCOPE": self.media_scope(),
            }
        )
        return v

    def _nda_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v.update(
            {
                "OPP_CONFIDENTIALITY_PERIOD": str(self._rng.choice([1, 2, 3, 5])),
                "OPP_NDA_TYPE": self._pick(["Mutual", "One-Way"]),
            }
        )
        return v

    def _work_for_hire_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v.update(
            {
                "OPP_SERVICE_DESCRIPTION": self._pick(
                    [
                        "Music production and mixing services",
                        "Sound design and audio engineering",
                        "Film scoring and composition",
                        "Video production and editing",
                        "Graphic design and artwork creation",
                    ]
                ),
                "OPP_ADVANCE_AMOUNT": self.advance_amount(1000, 100_000),
                "OPP_IP_ASSIGNMENT": self._pick(["Full Assignment", "Work-for-Hire"]),
            }
        )
        return v

    def _assignment_values(self) -> dict[str, str]:
        v = self._base_form_values()
        assignee = self.person_name()
        v.update(
            {
                "OPP_ASSIGNEE": assignee,
                "OPP_ASSIGNEE_ENTITY": self.legal_entity(),
                "OPP_ORIGINAL_AGREEMENT_DATE": self.effective_date(2018, 2024),
                "OPP_ASSIGNMENT_FEE": self.advance_amount(0, 50_000),
            }
        )
        return v

    def _termination_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v.update(
            {
                "OPP_TERMINATION_EFFECTIVE_DATE": self.effective_date(2025, 2027),
                "OPP_SELL_OFF_PERIOD": self.sell_off_period(),
                "OPP_SURVIVING_OBLIGATIONS": self._pick(
                    [
                        "Sections 5, 7, and 9 shall survive termination",
                        "Confidentiality and indemnification obligations survive",
                        "All payment obligations accrued prior to termination survive",
                    ]
                ),
            }
        )
        return v

    def _merchandise_values(self) -> dict[str, str]:
        v = self._base_form_values()
        v.update(
            {
                "OPP_MERCH_RIGHTS": "Yes",
                "OPP_ROYALTY_RATE": self.royalty_rate(10, 30),
                "OPP_ADVANCE_AMOUNT": self.advance_amount(1000, 50_000),
                "OPP_MERCH_SCOPE": self._pick(
                    [
                        "Apparel",
                        "All Merchandise",
                        "Digital Goods",
                        "Apparel and Accessories",
                        "Tour Merchandise",
                    ]
                ),
            }
        )
        return v
