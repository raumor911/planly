# Planly: DOCX Preservation Engine Specification

## 1. Arquitectura Técnica

La solución se basa en una **Arquitectura de Preservación por Mutación**. En lugar de reconstruir el documento desde cero, el motor actúa directamente sobre el paquete OpenXML (DOCX) original, modificando únicamente los nodos de texto y clonando estructuras de tabla.

### Módulos
1.  **Syllabus Parser**: Extrae contenido académico estructurado usando Gemini 2.5 Flash.
2.  **Template Inspector**: Analiza el XML del DOCX para identificar tablas de sesiones y placeholders mediante heurísticas de contenido.
3.  **Preservation Engine**: El núcleo del sistema. Maneja la clonación de filas (`w:tr`) y la inyección de texto en nodos `<w:t>`.
4.  **Validation Engine**: Verifica que el documento resultante sea un ZIP válido y contenga los activos originales (imágenes, estilos).
5.  **Orchestrator**: Coordina el flujo entre los módulos.

## 2. Decisiones Técnicas

-   **fast-xml-parser**: Elegido por su capacidad de preservar el orden de los elementos XML (`preserveOrder: true`), crucial para no corromper el esquema de Word.
-   **Clonación de Nodos**: En lugar de usar etiquetas como `{#sesiones}`, clonamos el nodo XML de la fila "semilla". Esto garantiza que bordes, colores de celda y tipografías se hereden perfectamente.
-   **Gemini JSON Schema**: Forzamos a la IA a devolver un JSON estricto para asegurar la compatibilidad con el motor de inyección.

## 3. Estructura de Carpetas
```text
src/server/modules/
├── docx/
│   ├── types.ts         # Definiciones de datos
│   ├── inspector.ts     # Análisis de plantillas
│   ├── engine.ts        # Motor de mutación XML
│   └── orchestrator.ts  # Coordinador
├── parser/
│   └── syllabus.ts      # Extracción IA
└── validation/
    └── validator.ts     # Control de calidad
```

## 4. Estrategia de Preservación

### Reglas Críticas
- **No tocar `word/media/`**: Todas las imágenes se conservan intactas en el ZIP.
- **Inyección en `<w:t>`**: El texto se reemplaza dentro de los nodos de texto existentes, preservando los nodos de propiedades de ejecución (`w:rPr`).
- **Clonación de Filas**: Se detecta la fila de encabezado, se toma la siguiente como prototipo, y se clona para cada sesión generada.

## 5. Endpoints Implementados

- `POST /api/projects/:id/parse-syllabus`: Recibe texto del temario y devuelve JSON estructurado.
- `POST /api/projects/:id/render-docx`: Recibe la plantilla (Base64) y el JSON, devuelve el DOCX procesado.

## 6. Criterios de Aceptación

1.  El documento abre en Word sin errores de "archivo dañado".
2.  Logos y encabezados institucionales permanecen idénticos.
3.  Las tablas mantienen sus colores y anchos de columna originales.
4.  El contenido de la IA se inserta en las celdas correspondientes.
5.  La bibliografía y evaluación se incluyen según la estructura detectada.

## 7. Checklist de Pruebas

- [ ] Prueba con plantilla con imágenes en el header.
- [ ] Prueba con tabla de planeación de más de 10 columnas.
- [ ] Validación de suma de porcentajes de evaluación (100%).
- [ ] Verificación de integridad del ZIP tras el procesamiento.
