import { createRoot } from 'react-dom/client'
import 'maplibre-gl/dist/maplibre-gl.css'
import 'react-spring-bottom-sheet/dist/style.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <App />,
)
