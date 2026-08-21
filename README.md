# 🌋 SismoPerú — Sistema Estadístico de Sismos del Perú

Dashboard web que muestra estadísticas de los sismos registrados en el territorio peruano, consumiendo datos reales y actualizados de la API oficial del [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/).

## 📊 Funcionalidades

- **Tarjetas KPI**: total de sismos, magnitud promedio, sismo más fuerte y profundidad promedio
- **Gráfico de línea**: cantidad de sismos por día
- **Gráfico de barras**: distribución de sismos por rango de magnitud
- **Mapa interactivo**: epicentros geolocalizados según su magnitud (Leaflet)
- **Tabla detallada**: fecha, lugar, magnitud y profundidad de cada sismo
- **Filtro por periodo**: últimos 7, 30 o 90 días

## 🛠️ Tecnologías

| Tecnología | Uso |
|------------|-----|
| HTML5 | Estructura del dashboard |
| CSS3 | Diseño responsivo, tema oscuro |
| JavaScript (Vanilla) | Lógica y consumo de API |
| Chart.js | Gráficos estadísticos |
| Leaflet | Mapa interactivo |
| USGS FDSN API | Fuente de datos sísmicos |

## 🚀 Ver en línea

Desplegado en Render: [sismos-peru.onrender.com](https://sismos-peru.onrender.com)

## 👤 Autor

Proyecto desarrollado para el curso **Programación I** — USMP.

Flujo de trabajo: Git → GitHub → Rama `feature/dashboard` → Pull Request → Merge a `main` → Deploy en Render.
