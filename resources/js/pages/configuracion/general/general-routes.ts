/**
 * URLs de configuración general sin Wayfinder.
 * `resources/js/routes` se genera en el build y no está en git.
 */
const base = '/configuracion/general';

const general = {
    show: () => ({ url: base }),
    update: () => ({ url: base }),
};

export default general;
