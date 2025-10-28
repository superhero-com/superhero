# Docs (MkDocs Material)

Local preview:

```bash
python -m pip install --upgrade pip
pip install -r docs/requirements.txt
mkdocs serve
```

Deploy via CI on main branch. Manual deploy:

```bash
mkdocs gh-deploy --force
```
