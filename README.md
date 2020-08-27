# ADF-ARM-Reader

Depurar un archivo JSON generado por Azure Data Factory con el recurso requerido y sus correspondientes dependencias

## Campos

- Nombre del Pipeline: Nombre del pipeline principal (si se quieren exportar varios, se debe generar un pipeline que contenga todos los pipelines a exportar)
- ARM Template: Pegar el JSON completo que se obtiene al exportar el ARM Template
- ¿Desea incluir el Pipeline principal?: Si selecciona esta opción, el pipeline principal se incluirá en el ARM generado

## Resultados

- Muestra los recursos flitrados
- Si el JSON Es válido
- Cantidad de recursos antes de filtrar
