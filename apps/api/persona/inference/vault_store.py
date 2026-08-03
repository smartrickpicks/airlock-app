"""VaultStore — persistence layer for TimeVault behavioral snapshots.

Handles reading and writing TimeVault data to disk as YAML files with
a companion JSON index for fast querying. Each user gets their own
subdirectory under the vaults root.

File layout:
    sessions/vaults/{user_id}/{vault_id}.yaml     # individual vault
    sessions/vaults/{user_id}/vault-index.json    # queryable index

The JSON index enables listing, filtering, and outcome tracking without
parsing every YAML file on disk.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

from inference.timevault import TimeVault

# Default vaults directory: repo_root/sessions/vaults/
_DEFAULT_VAULTS_DIR = Path(__file__).parent.parent / "sessions" / "vaults"


class VaultStore:
    """Persistence layer for TimeVault snapshots (YAML files + JSON index)."""

    def __init__(self, vaults_dir: Path | str | None = None) -> None:
        self.vaults_dir = Path(vaults_dir) if vaults_dir else _DEFAULT_VAULTS_DIR

    # ── save ────────────────────────────────────────────────────────────

    def save(self, vault: TimeVault) -> Path:
        """Write vault YAML file and update JSON index.

        Creates the user directory if it doesn't exist. Appends an entry
        to the vault index (or creates the index if first vault for user).

        Args:
            vault: TimeVault instance to persist.

        Returns:
            Path to the written YAML file.
        """
        user_dir = self.vaults_dir / vault.user_id
        user_dir.mkdir(parents=True, exist_ok=True)

        # Write YAML
        vault_dict = vault.to_dict()
        yaml_path = user_dir / f"{vault.vault_id}.yaml"
        yaml_path.write_text(
            yaml.dump(
                vault_dict,
                default_flow_style=False,
                sort_keys=False,
                allow_unicode=True,
            )
        )

        # Update index
        index = self._load_index(vault.user_id)
        index_entry = {
            "vault_id": vault.vault_id,
            "timestamp": vault.timestamp,
            "trigger": vault.trigger,
            "severity": vault.state.drift_severity,
            "outcome": vault.outcome,
            "file": f"{vault.vault_id}.yaml",
        }
        index["vaults"].append(index_entry)
        index["vault_count"] = len(index["vaults"])
        index["last_updated"] = datetime.now(timezone.utc).isoformat()
        self._write_index(vault.user_id, index)

        return yaml_path

    # ── load ────────────────────────────────────────────────────────────

    def load(self, user_id: str, vault_id: str) -> dict[str, Any] | None:
        """Load a single vault by ID.

        Args:
            user_id: User identifier.
            vault_id: Vault identifier.

        Returns:
            Vault dict or None if not found.
        """
        yaml_path = self.vaults_dir / user_id / f"{vault_id}.yaml"
        if not yaml_path.exists():
            return None
        return yaml.safe_load(yaml_path.read_text())

    # ── list ────────────────────────────────────────────────────────────

    def list(self, user_id: str, trigger: str | None = None, since: str | None = None) -> list[dict[str, Any]]:
        """List index entries with optional filters.

        Args:
            user_id: User identifier.
            trigger: Filter to vaults with this trigger type.
            since: ISO timestamp — only return vaults at or after this time.

        Returns:
            List of index entry dicts matching the filters.
        """
        index = self._load_index(user_id)
        entries = index["vaults"]

        if trigger is not None:
            entries = [e for e in entries if e["trigger"] == trigger]

        if since is not None:
            since_dt = datetime.fromisoformat(since)
            entries = [
                e for e in entries
                if datetime.fromisoformat(e["timestamp"]) >= since_dt
            ]

        return entries

    # ── tag_outcome ─────────────────────────────────────────────────────

    def tag_outcome(
        self,
        user_id: str,
        vault_id: str,
        outcome: str,
        notes: str | None = None,
    ) -> bool:
        """Tag a vault with a retrospective outcome label.

        Updates both the YAML file and the JSON index entry.

        Args:
            user_id: User identifier.
            vault_id: Vault identifier.
            outcome: Outcome label (e.g. 'positive', 'negative', 'neutral').
            notes: Optional free-text annotation.

        Returns:
            True if vault was found and updated, False otherwise.
        """
        yaml_path = self.vaults_dir / user_id / f"{vault_id}.yaml"
        if not yaml_path.exists():
            return False

        # Update YAML
        data = yaml.safe_load(yaml_path.read_text())
        tagged_at = datetime.now(timezone.utc).isoformat()
        data["outcome"] = outcome
        data["outcome_tagged_at"] = tagged_at
        data["notes"] = notes
        yaml_path.write_text(
            yaml.dump(
                data,
                default_flow_style=False,
                sort_keys=False,
                allow_unicode=True,
            )
        )

        # Update index
        index = self._load_index(user_id)
        for entry in index["vaults"]:
            if entry["vault_id"] == vault_id:
                entry["outcome"] = outcome
                break
        index["last_updated"] = datetime.now(timezone.utc).isoformat()
        self._write_index(user_id, index)

        return True

    # ── export_jsonl ────────────────────────────────────────────────────

    def export_jsonl(self, user_id: str) -> list[str]:
        """Export all vaults for a user as JSONL lines.

        Each line is a self-contained JSON object representing one vault.

        Args:
            user_id: User identifier.

        Returns:
            List of JSON strings (one per vault).
        """
        index = self._load_index(user_id)
        lines: list[str] = []
        for entry in index["vaults"]:
            data = self.load(user_id, entry["vault_id"])
            if data is not None:
                lines.append(json.dumps(data, default=str))
        return lines

    # ── private helpers ─────────────────────────────────────────────────

    def _index_path(self, user_id: str) -> Path:
        return self.vaults_dir / user_id / "vault-index.json"

    def _load_index(self, user_id: str) -> dict[str, Any]:
        """Load or initialize the JSON index for a user."""
        path = self._index_path(user_id)
        if path.exists():
            return json.loads(path.read_text())
        return {
            "user_id": user_id,
            "vault_count": 0,
            "last_updated": None,
            "vaults": [],
        }

    def _write_index(self, user_id: str, index: dict[str, Any]) -> None:
        """Write the JSON index to disk."""
        path = self._index_path(user_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(index, indent=2, default=str))
