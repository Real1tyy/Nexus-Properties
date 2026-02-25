---
sidebar_position: 14
---

# Vault Statistics

The Vault Statistics section in Settings lets you analyze the shape of your knowledge graph at a glance. It computes vault-wide metrics about your file hierarchy — how many trees exist, their depth, and how files are connected.

## How to Use

Open **Settings → Nexus Properties → Statistics**. Statistics are computed automatically each time you open the tab, so they always reflect the current state of your vault.

## Available Metrics

| Metric | Description |
|---|---|
| **Total Indexed Nodes** | Number of files currently tracked by the indexer. |
| **Trees (Roots)** | Number of root files — files with no parent links. Each root is the top of an independent tree. |
| **Average Tree Depth** | The average maximum depth across all trees. |
| **Max Tree Depth** | The depth of the deepest tree in the vault. |
| **Nodes with Parents** | Files that have at least one parent link. |
| **Nodes with Children** | Files that have at least one child link. |
| **Nodes with Related** | Files that have at least one related link. |

## Notes

- Only files within your configured [directory scanning](../configuration#directory-scanning) scope are included.
- A "tree" is defined as a connected component rooted at a file with no parents. Depth is measured by following child links downward.
- The computation reads from the in-memory index — no disk I/O is involved, so it runs quickly even on large vaults.
