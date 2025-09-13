#Integrantes

- Diarte Salas Gilberto
- Haro Calvo Fernando Horacio
- Solano Meza Angel Daniel
- Sandez Islas Danna Guadalupe
- Vazquez Guzman Jorge Antonio


#  Guía de Inicio Rápido: Malware Scanner Lab


## 1. Configuración del Backend

Asegúrate de tener **Docker** iniciado antes de comenzar.

1.  Navega al directorio del backend:
    ```bash
    cd /malware-scanner-lab/backend
    ```

2.  Instala las dependencias del proyecto:
    ```bash
    npm i
    ```

3.  Ejecuta el contenedor de Docker para ClamAV. Esto iniciará el servicio de escaneo de malware.
    ```bash
    docker run -d --name clamav -p 3310:3310 clamav/clamav:latest
    ```

4.  Compila y ejecuta el backend en modo de desarrollo:
    ```bash
    npm run dev
    ```

---

## 2. Configuración del Frontend

1.  Abre una nueva terminal y accede al directorio del frontend:
    ```bash
    cd /malware-scanner-lab/frontend
    ```

2.  Inicia un servidor web local para el `index.html` en el puerto `8081`. (Requiere Python)
    ```bash
    python -m http.server 8081
    ```

---

## 3. Acceso al Sistema

Una vez que ambos servidores estén en marcha, puedes acceder a la aplicación desde tu navegador visitando la siguiente URL:

[http://localhost:8081/](http://localhost:8081/)
