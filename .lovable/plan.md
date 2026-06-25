## Cambios en POS

### 1. Botón (-) en tarjeta de producto elimina automáticamente al llegar a 0

**Archivo:** `src/pages/POS.tsx` — función `updateQuantity`

Bug actual: cuando la cantidad es 1 y se presiona (-), el item se mantiene en el carrito (el ternario devuelve el item sin modificar y el filtro no lo quita).

Fix: aplicar la nueva cantidad siempre y dejar que el `.filter(quantity > 0)` elimine el item. Mostrar toast "Producto eliminado" cuando se quita.

Resultado: presionar (-) hasta llegar a 0 desde la tarjeta del producto remueve el item del carrito sin necesidad de abrir el carrito.

### 2. Diálogo "¿Promo o unidad?" al agregar producto con promoción tipo bulk

**Archivos:** `src/pages/POS.tsx`

Comportamiento nuevo: cuando el usuario hace clic en una tarjeta de producto que tiene `promotion.type === "bulk"` **y aún no está en el carrito** (cantidad 0), en lugar de agregar 1 unidad se abre un pequeño diálogo modal con:

- Título: nombre del producto
- Descripción de la promo (ej: "3 x $10.000")
- Dos botones grandes:
  - **"Agregar promoción (3 unid - $10.000)"** → agrega la cantidad exacta de la promo en un solo paso, con el descuento ya aplicado.
  - **"Agregar 1 unidad"** → comportamiento normal, agrega 1 a precio regular.
- Botón cerrar (X).

Después de agregar, los botones +/- de la tarjeta siguen funcionando normal (de a 1). Si vuelve a llegar a 0 y lo agrega de nuevo, el diálogo aparece otra vez.

Las promociones de **% de descuento** y **monto fijo** no cambian: siguen aplicándose automáticamente desde la primera unidad (sin diálogo).

### Detalles técnicos

- Nuevo estado: `const [promoDialogProduct, setPromoDialogProduct] = useState<Product | null>(null)`.
- En `addToCart`: al inicio, si `cartQuantity === 0 && product.promotion?.type === "bulk" && product.promotion.quantity`, abrir el diálogo y retornar; el resto del flujo se mueve a una función `addToCartDirect(product, quantity)` reutilizable.
- `addToCartDirect` agrega la cantidad indicada respetando validación de stock (`allow_negative_stock`), precio de cliente y llama a `checkPromotion` al final para aplicar el descuento bulk si corresponde.
- Diálogo nuevo `<Dialog>` al final del JSX usando los componentes shadcn ya importados, con `max-w-md` y dos botones apilados en mobile (`flex-col sm:flex-row`).
- Click en la tarjeta (`onClick` del Card): mantener `cartQuantity === 0 ? addToCart(product) : undefined`; el diálogo se dispara desde `addToCart`.
- Atajo de teclado `onIncrementLast`: sin cambios (ya opera sobre items en carrito).

### Verificación

- Click en producto con promo bulk → aparece diálogo con ambas opciones.
- "Agregar promoción" → carrito muestra cantidad de promo y descuento aplicado en una sola acción.
- "Agregar 1 unidad" → carrito muestra 1, sin descuento.
- Botón (-) en tarjeta: al pasar de 1 a 0, el item desaparece del carrito y se ve el toast "Producto eliminado".
- Productos sin promo o con promo % / fija: clic agrega 1 unidad como antes, sin diálogo.
