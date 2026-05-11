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

## Identidad de Git (nombre y correo)

Antes de hacer commits, conviene tener configurado **quién eres**. Solo hace falta una vez por ordenador (global):

```powershell
git config --global user.name "Tu nombre"
git config --global user.email "tu-correo-o-noreply-de-github@users.noreply.github.com"
```

Para ver lo que está configurado:

```powershell
git config --global --list
```

## Trabajar en dos ordenadores (ej. aquí y en casa)

La idea es tener **un solo repositorio en GitHub** (u otro hosting) y en cada PC hacer **clone** una vez; después solo **`pull`** antes de trabajar y **`push`** cuando termines algo.

### Una sola vez: subir este proyecto a GitHub

1. Entra en [github.com](https://github.com), **New repository**.
2. Pon nombre (ej. `volleyschedule-registrations`), **sin** marcar “Add a README” si ya tienes código local (evitas conflictos).
3. Copia la URL HTTPS del repo (ej. `https://github.com/TU_USUARIO/volleyschedule-registrations.git`).

En **este** PC, en la carpeta del proyecto:

```powershell
cd "C:\Users\gerado\OneDrive\ZD\OneDrive\Desktop\IdeasI\volleyschedule-registrations"

git remote add origin https://github.com/TU_USUARIO/volleyschedule-registrations.git
git push -u origin main
```

- Si GitHub pide contraseña: ya **no** vale la contraseña de la cuenta; usa un **Personal Access Token** (Fine-grained o classic) con permiso de repositorio, o deja que **Git Credential Manager** (instalado con Git para Windows) abra el navegador y autorice.

Si ya existiera un remoto mal puesto:

```powershell
git remote remove origin
git remote add origin https://github.com/TU_USUARIO/volleyschedule-registrations.git
```

### En el otro dispositivo (casa)

Instala **Git** y **Node.js** si aún no los tienes. Luego:

```powershell
cd Desktop
git clone https://github.com/TU_USUARIO/volleyschedule-registrations.git
cd volleyschedule-registrations
npm install
```

Configura en ese PC también `user.name` y `user.email` si no lo están (`git config --global ...`).

### Cada día que cambies de ordenador

En el PC donde **empieces** a trabajar:

```powershell
git pull
```

Cuando acabes bloques de trabajo:

```powershell
git add -A
git commit -m "descripción breve"
git push
```

Así el otro ordenador siempre puede hacer `git pull` y tener lo último.

### Opcional: clave SSH

Si prefieres no usar HTTPS + token, puedes configurar [SSH keys en GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh) y usar la URL `git@github.com:TU_USUARIO/volleyschedule-registrations.git` al añadir `origin`.

## Resumen

| Acción                         | Dónde queda                          |
|--------------------------------|--------------------------------------|
| Guardar `.md` en Cursor/VS Code | Disco local                          |
| `git add` + `git commit`       | Historial Git **local**              |
| `git push`                     | Copia en **internet** (si hay remoto) |
