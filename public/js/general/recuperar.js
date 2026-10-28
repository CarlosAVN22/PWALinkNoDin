document.addEventListener('DOMContentLoaded', function () {
    const formulario = document.getElementById('ld-recuperar-form');
    const correo = document.getElementById('ld-recuperar-correo');
    const mensaje = document.getElementById('ld-recuperar-estado');

    if (!formulario || !correo || !mensaje) return;

    function avisar(texto, error) {
        mensaje.textContent = texto;
        mensaje.hidden = false;
        mensaje.classList.toggle('ld-recuperar-error', Boolean(error));
    }

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        const email = correo.value.trim().toLowerCase();

        if (!email || !correo.checkValidity()) {
            avisar('Ingresa una dirección de correo electrónico válida.', true);
            correo.focus();
            return;
        }

        // La solicitud se almacena únicamente para demostrar el flujo, sin guardar contraseñas.
        const clave = 'linknodin-v3-recuperacion-demo';
        try {
            localStorage.setItem(clave, JSON.stringify({fecha: new Date().toISOString(), realizada: true}));
        } catch (error) {
            // El mensaje de demostración no depende del almacenamiento local.
        }

        avisar('Solicitud de demostración registrada. Cuando se conecte el servicio de correo, recibirás instrucciones si existe una cuenta con esta dirección. No se ha enviado ningún correo.', false);
        formulario.reset();
    });
});
