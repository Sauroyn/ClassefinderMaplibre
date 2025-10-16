# Paramètres modifiables de l'itinéraire

Voici les principaux paramètres qui influencent le calcul et l'affichage des itinéraires, ainsi que leur emplacement dans le code :

| Paramètre                                      | Description                                                                 | Fichier / Emplacement                                                                 |
|------------------------------------------------|-----------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| **Tolérance angle "tout droit"**               | Un segment est considéré comme "tout droit" si l'angle est entre 150° et 210°. | `src/map/computeRoute.ts` → fonction `buildManeuvers`, variables `abs >= 150 && abs <= 210` |
| **Seuil détection virage**                     | Virage classique : ≥ 60°, léger : ≥ 25°.                                    | `src/map/computeRoute.ts` → fonction `buildManeuvers`, conditions sur `abs` et `delta`      |
| **Détection rond-point (arc)**                 | ≥ 3 segments consécutifs tournant dans le même sens (seuil 20°).            | `src/map/computeRoute.ts` → fonction `buildManeuvers`, variables `arcThreshold`, `arcCount` |
| **Distance pour recalcul d'itinéraire**        | Distance à partir de laquelle on recalcule l'itinéraire si l'utilisateur s'éloigne. | `src/components/route-planner/NavigationController.ts` (rechercher "recalcule" ou "distance") |
| **Distance pour signaler la fin**              | Distance à laquelle l'arrivée est annoncée.                                 | `src/components/route-planner/NavigationBanner.tsx` ou `NavigationController.ts` (rechercher "arrivée" ou "proche") |
| **Vitesse de marche par défaut**               | Utilisée pour estimer le temps (m/s, par défaut 1.4).                       | `src/map/computeRoute.ts` → variable `speed`                                                |
| **Marge de départ utilisateur (buffer)**       | Minutes ajoutées pour anticiper le départ.                                  | `src/components/settings/SettingsModal.tsx` et `src/hooks/useSettingsDraft.ts`              |

Pour modifier ces paramètres, éditez les fichiers indiqués et ajustez les valeurs selon vos besoins.
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
