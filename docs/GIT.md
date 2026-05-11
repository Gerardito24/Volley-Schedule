# Guardar cambios en Git (incluidos los `.md`)

Los archivos **Markdown** (`.md`) —por ejemplo `README.md`, `docs/SCHEDULE.md` o este archivo— son archivos de texto normales en el proyecto. **No hay un paso especial**: se guardan en el historial de Git igual que `.tsx`, `.ts`, etc.

## Qué significa cada cosa

1. **Guardar en el editor** (Ctrl+S): escribe el archivo en disco. Eso no crea un commit todavía.
2. **`git add`**: marca qué archivos entran en el **siguiente commit** (incluye `.md` si los añades).
3. **`git commit`**: guarda una “foto” del proyecto en tu copia local del repositorio.
4. **`git push`**: sube esos commits a un servidor remoto (GitHub, GitLab, etc.). **Solo funciona si configuraste un remoto** (`origin` u otro nombre).

## Comandos habituales (PowerShell)

Desde la carpeta del proyecto:

```powershell
cd "C:\Users\gerado\OneDrive\ZD\OneDrive\Desktop\IdeasI\volleyschedule-registrations"

# Ver qué cambió (también listará .md modificados)
git status

# Incluir todo (código + documentación .md)
git add -A

git commit -m "docs: describir cambios brevemente"
```

Si al hacer `git push` aparece **“No configured push destination”**, el repo **no tiene remoto**. Hay que crear el repositorio en GitHub (u otro) y enlazarlo:

```powershell
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

(Sustituye la URL y el nombre de rama si usas otra distinta de `main`.)

## Resumen

| Acción                         | Dónde queda                          |
|--------------------------------|--------------------------------------|
| Guardar `.md` en Cursor/VS Code | Disco local                          |
| `git add` + `git commit`       | Historial Git **local**              |
| `git push`                     | Copia en **internet** (si hay remoto) |
