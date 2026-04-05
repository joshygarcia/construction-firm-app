Control Central
===============

Aplicación de escritorio para control financiero de obras de construcción.
Funciona 100% offline — no requiere conexión a Internet ni instalación.


CÓMO EJECUTAR
-------------

1. Descomprima el archivo ZIP en cualquier carpeta (por ejemplo, en el Escritorio
   o en Documentos).

2. Dentro de la carpeta descomprimida encontrará el archivo:

       Control Central.exe

3. Haga doble clic sobre "Control Central.exe" para abrir la aplicación.

4. La primera vez que Windows vea el archivo, puede mostrar la advertencia
   "Windows protegió su PC" (SmartScreen). Esto es normal para aplicaciones
   que aún no están firmadas comercialmente. Para continuar:

       - Haga clic en "Más información"
       - Luego clic en "Ejecutar de todas formas"


DÓNDE SE GUARDAN SUS DATOS
--------------------------

Todos los datos (proyectos, movimientos, presupuestos, facturas y recibos
adjuntos) se guardan automáticamente en:

       %APPDATA%\Control Central\

Esta carpeta se crea la primera vez que abre la aplicación. Sus datos
permanecen allí aunque mueva, elimine o reinstale la carpeta de la aplicación.


CÓMO HACER UNA COPIA DE SEGURIDAD
---------------------------------

Copie el archivo:

       %APPDATA%\Control Central\finance-store.json

(Puede pegar esa ruta en la barra de direcciones del Explorador de Windows.)

También puede copiar la subcarpeta "receipts" si ha adjuntado recibos.


ACTUALIZACIONES
---------------

La aplicación comprueba automáticamente si hay nuevas versiones disponibles
cada vez que la abre. Si existe una actualización, aparecerá una ventana que
dice:

       "Versión vX.Y.Z disponible. ¿Actualizar ahora?"

Haga clic en "Actualizar ahora" y la aplicación:

   1. Descargará la nueva versión (verá una barra de progreso).
   2. Se cerrará sola.
   3. Se volverá a abrir automáticamente con la versión nueva.

Sus datos NO se ven afectados — todo lo que haya registrado se conserva
porque vive en %APPDATA%\Control Central\, fuera de la carpeta del programa.

También puede comprobar actualizaciones manualmente desde el menú superior:

       Ayuda → Buscar actualizaciones…

(Si el menú no está visible, presione la tecla Alt para mostrarlo.)


REQUISITOS
----------

- Windows 10 o posterior (64 bits)
- No requiere instalación de software adicional


SOPORTE
-------

Si tiene problemas al ejecutar la aplicación, comuníquese con quien le envió
este archivo.
