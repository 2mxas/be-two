# be-two — NestJS + MongoDB: Respuestas de validación

Este documento responde las preguntas guía de la **Activity 1** del `GUIDE.md` y todas las preguntas de `TASKS.md`.

---

## ACTIVITY 1 — Preguntas guía sobre el módulo Cars

### 1. ¿Por qué `nombre` tiene `unique: true` pero `modelo` no?

En `car.entity.ts`, el campo `nombre` tiene `@Prop({ unique: true, index: true })` porque representa el identificador de negocio del auto y no deberían existir dos autos con el mismo nombre, por lo que MongoDB crea una restricción de unicidad a nivel de índice para ese campo. `modelo`, en cambio, no necesita ser único ya que perfectamente pueden existir varios autos del mismo modelo, y la restricción de unicidad solo tiene sentido cuando el valor del campo identifica de forma exclusiva a un documento.

---

### 2. ¿Qué métodos tienen `try/catch` y por qué no todos?

En `cars.service.ts` solo `create` y `update` tienen bloque `try/catch`, ya que son los únicos métodos que escriben en la base de datos y, por tanto, los únicos que pueden violar la restricción `unique: true` del campo `nombre`. Cuando eso ocurre, MongoDB lanza el error con código `11000`, y el bloque `catch` lo captura y lo delega a `handleException`, que lo convierte en una respuesta `400 Bad Request` en lugar de dejar que llegue al cliente como un `500` sin manejar. `findAll`, `findOne` y `remove`, en cambio, no lanzan ese tipo de error de escritura, por lo que no necesitan `try/catch` para el error `11000`; además, `findOne` y `remove` manejan sus propios casos de error con `if` y excepciones explícitas de NestJS.

---

### 3. ¿Qué pasaría si `Logger` se llamara sin el argumento `'Cars'`?

`new Logger('Cars')` le pasa un contexto al logger que aparece entre corchetes en los logs del servidor (`[Cars] Car exists in db...`), de modo que si se instanciara como `new Logger()` sin argumento, los mensajes de log seguirían funcionando pero no tendrían un contexto identificable, lo cual dificulta rastrear de qué módulo proviene cada línea de log en aplicaciones con múltiples servicios.

---

### 4. ¿Qué pasa si se olvida importar `CarsModule` en `AppModule`?

Si `CarsModule` no está en el array `imports` de `AppModule`, NestJS no registra ninguno de sus componentes —ni el controlador, ni el servicio, ni el esquema de Mongoose—, por lo que la aplicación arranca sin errores pero las rutas `/api/cars` simplemente no existen, y cualquier petición a esas rutas devuelve `404 Not Found`.

---

### 5. ¿Por qué solo el endpoint DELETE usa `ParseMongoIdPipe`?

`ParseMongoIdPipe` valida que el `:id` recibido sea un ObjectId válido de MongoDB y, si no lo es, lanza un `400 Bad Request` antes de que el controlador llegue a ejecutarse. El DELETE lo necesita como refuerzo explícito porque `remove` en el servicio va directamente a `deleteOne` sin llamar primero a `findOne`, así que sin el pipe un id inválido llegaría directo a MongoDB y causaría un error de bajo nivel. `findOne` y `update`, en cambio, llaman a `this.findOne(id)` en el servicio, que ya contiene la validación `isValidObjectId(id)` internamente, de modo que la validación existe pero vive en la capa de servicio en vez de en la de controlador.

---

---

## TASKS.md — Preguntas de validación

---

### Question 1 — ¿MongoDB considera "McQueen" y "mcqueen" como duplicados?

MongoDB distingue entre mayúsculas y minúsculas por defecto, así que a nivel de base de datos `"McQueen"` y `"mcqueen"` son valores distintos y ambos podrían coexistir sin violar el índice único. Sin embargo, la línea `createCarDto.nombre = createCarDto.nombre.toLowerCase()` en el método `create` de `cars.service.ts` normaliza el valor a minúsculas antes de intentar guardarlo, de modo que tanto `"McQueen"` como `"mcqueen"` se convierten en `"mcqueen"` antes del `INSERT`. Cuando se intenta crear el segundo, MongoDB recibe el mismo string que ya existe, detecta la colisión en el índice único y lanza el error `11000`, que el `catch` convierte en `400 Bad Request`. Sin esa línea, los dos strings llegarían tal cual y ambos se guardarían sin error.

---

### Question 2 — ¿Por qué existen dos validaciones del ID?

`findOne` valida con `isValidObjectId(id)` en el servicio y `remove` valida con `ParseMongoIdPipe` en el controlador porque ambas validaciones actúan en distintos puntos del ciclo de vida de la solicitud. Si `findOne` no tuviera `isValidObjectId` y recibiera `"abc"`, llamaría a `this.carsModel.findById("abc")`, Mongoose intentaría convertir ese string a un ObjectId lanzando un `CastError` que no es una excepción de NestJS, y como no hay un filtro de excepciones registrado para ese error, el cliente recibiría un `500 Internal Server Error`. Lo mismo ocurriría con `remove` sin el pipe: el `"abc"` llegaría a `deleteOne`, Mongoose lanzaría el mismo `CastError` y el cliente recibiría otro `500`. La diferencia de diseño es que `findOne` es un método de propósito general reutilizado también desde `update`, por lo que su validación interna lo hace seguro independientemente de quién lo llame, mientras que el pipe en `remove` actúa antes de que el controlador siquiera ejecute, rechazando el request con un `400` limpio sin tocar el servicio ni la base de datos. En ambos casos la respuesta correcta debería ser `400 Bad Request`, pero sin las validaciones ambos producirían erróneamente un `500`.

---

### Question 3 — ¿Por qué `create` necesita `try/catch` pero `findAll` no?

`create` interactúa con la restricción de unicidad del índice sobre `nombre`, de modo que si se intenta insertar un documento cuyo `nombre` ya existe, MongoDB lanza un error de escritura con código `11000` que ocurre de forma asíncrona dentro del driver de Mongoose y no es una excepción de NestJS, por lo que sin `try/catch` escaparía como un error no manejado. `findAll`, en cambio, solo lee documentos con `find()` y una operación de lectura nunca puede violar un índice único, así que no tiene motivo para esperar ese tipo de error. Si se elimina el `try/catch` de `create` y MongoDB lanza el error `11000`, el error llegaría como una promesa rechazada que NestJS no sabría categorizar y devolvería un `500 Internal Server Error`, lo cual sería incorrecto ya que es un error de input del usuario que merece un `400 Bad Request`; el `try/catch` con `handleException` es exactamente lo que hace esa conversión.

---

### Question 4 — ¿Cuántas queries hace `update` y puede haber inconsistencia?

El método `update` hace exactamente dos queries a la base de datos en el camino feliz: primero `this.findOne(id)`, que ejecuta un `findById(id)` internamente, y luego `car.updateOne(updateCarDto)`, que ejecuta el UPDATE en MongoDB. La respuesta se construye con un merge en memoria `{ ...car.toJSON(), ...updateCarDto }`, donde `car.toJSON()` representa el estado del documento antes del update y `updateCarDto` contiene solo los campos enviados por el cliente, lo que puede generar una inconsistencia. Por ejemplo, si el schema tuviera un campo `updatedAt` gestionado por un plugin o un pre-save hook, el `updateOne` lo actualizaría en MongoDB, pero el merge en memoria nunca lo incluiría, de modo que la API devolvería el valor viejo de ese campo mientras la base de datos ya tiene el nuevo. La alternativa segura sería hacer un `findById(id)` después del `updateOne` para devolver siempre el documento real, al costo de una tercera query.

---

### Question 5 — `forRootAsync` vs `forRoot` con `process.env`

El problema con `forRoot(process.env.MONGODB_URL || '...')` es que JavaScript evalúa la expresión `process.env.MONGODB_URL` en el momento exacto en que el intérprete carga y ejecuta el archivo del módulo, es decir, cuando `AppModule` es procesado durante el arranque de NestJS. Si `ConfigModule` aún no ha sido inicializado en ese momento, `process.env.MONGODB_URL` será `undefined` y la expresión cae en el fallback local, ignorando completamente el `.env`. El `app.module.ts` real soluciona esto con `forRootAsync` declarando `imports: [ConfigModule]` e `inject: [ConfigService]` en la configuración, y usando `configService.getOrThrow<string>('MONGODB_URL')` dentro del `useFactory`. Esto garantiza dos cosas a la vez: NestJS inicializa `ConfigModule` antes de ejecutar el factory, por lo que la variable ya existe en el entorno cuando se necesita, y `getOrThrow` lanza un error explícito en tiempo de arranque si `MONGODB_URL` no está definida en el `.env`, en lugar de conectarse silenciosamente a `undefined` o a un fallback incorrecto.

---

### Question 6 — Errores al olvidar imports del módulo

Si se olvida importar `CarsModule` en `AppModule`, la aplicación arranca sin error porque NestJS simplemente no registra ninguno de sus componentes, pero al hacer la primera petición a `/api/cars` el servidor responde con `404 Not Found` ya que el controlador nunca fue registrado en el sistema de routing. Si en cambio se importa `CarsModule` pero se olvida `MongooseModule.forFeature` dentro de él, la aplicación falla al arrancar: NestJS intenta instanciar `CarsService`, cuyo constructor pide `@InjectModel(Car.name)`, pero como el modelo nunca fue registrado no puede resolver la dependencia y lanza un error en tiempo de inicialización indicando que no puede resolver las dependencias de `CarsService`. El archivo a revisar para diagnosticarlo es `cars.module.ts`, verificando que el array `imports` contiene `MongooseModule.forFeature([{ name: Car.name, schema: CarSchema }])`.

---

### Question 7 — `remove` sin `findOne` previo

Ir directamente a `deleteOne` es más eficiente porque evita una query innecesaria a la base de datos en el caso exitoso y, además, evita una condición de carrera: si otro proceso eliminara el documento entre el `findOne` y el `deleteOne`, el primero encontraría el documento pero el segundo no lo borraría, generando un estado inconsistente; al fusionar ambas operaciones en `deleteOne` el resultado es atómico. Dicho esto, `deletedCount` puede ser `0` incluso con un ObjectId de formato válido cuando el documento simplemente no existe en la base de datos, ya sea porque fue eliminado previamente por otro proceso o petición concurrente, o porque nunca fue creado, en cuyo caso MongoDB ejecuta el `deleteOne` sin error pero reporta `deletedCount: 0`, y el `if (deletedCount === 0)` captura exactamente ese escenario lanzando `BadRequestException`.

---

### Question 8 — Pipe como pipe vs lógica en el servicio

La ventaja arquitectónica de usar el pipe es que corre en la capa de transporte, en la fase de resolución de parámetros del controlador, antes de que el método del controlador se ejecute, de modo que si el ID es inválido la solicitud es rechazada ahí mismo sin que el controlador, el servicio o la base de datos sean tocados. Si la misma lógica viviera en el servicio, el resultado final sería el mismo `400 Bad Request`, pero la validación correría más tarde en el ciclo de vida y el servicio mezclaría responsabilidades de transporte con lógica de negocio, rompiendo la separación de capas. En cuanto a `@Injectable()`, el `parse-mongo-id.pipe.ts` real lo incluye y su constructor no declara ninguna dependencia, por lo que en este caso concreto NestJS puede instanciarlo sin problema tanto con como sin `@Injectable()` cuando se usa como `@Param('id', ParseMongoIdPipe)`; sin embargo, si en algún momento se le agregara una dependencia inyectada en el constructor, `@Injectable()` pasaría a ser obligatorio para que el contenedor IoC pudiera resolverla, y la buena práctica es dejarlo siempre presente desde el inicio.

---

### Question 9 — Orden de configuración en `main.ts`

En el `main.ts` real el orden es `setGlobalPrefix('api')` → `enableCors()` → `useGlobalPipes(new ValidationPipe(...))` → `app.listen(port)`, y mover `useGlobalPipes` al inicio, antes de `setGlobalPrefix` y `enableCors`, no cambia nada en absoluto, ya que las tres son configuraciones que se registran en el objeto `app` antes de que el servidor comience a escuchar peticiones y NestJS las aplica todas al arrancar con `listen`, sin que ninguna dependa de la otra para configurarse correctamente. Mover `enableCors()` a después de `app.listen(port)`, en cambio, sí puede causar una condición de carrera: `listen` es asíncrono y el servidor comienza a aceptar conexiones inmediatamente, de modo que una petición que llegue en el brevísimo intervalo antes de que `enableCors()` se registre sería procesada sin los headers de CORS. En la práctica esto rara vez causa un problema visible en entornos locales, pero el principio correcto es que todos los middlewares y configuraciones globales deben registrarse antes de `app.listen()`, que es el punto en el que el servidor empieza a recibir tráfico real.