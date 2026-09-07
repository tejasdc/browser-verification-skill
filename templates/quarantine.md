# Quarantined tests

Rule: tag `@quarantine` after the second flake in seven days; excluded from the merge gate (`--grep-invert @quarantine`), still run nightly. Fixed (F-code named) or deleted within seven days. Never fixed by loosening the assertion.

| Test | Project | Tagged on | F-code (suspected) | Owner | Deadline | Outcome |
|---|---|---|---|---|---|---|
