"""Genera resources/js/lang/{es,en}/legal.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UPDATED_ES = '12 de septiembre de 2026'
UPDATED_EN = 'September 12, 2026'


def es_docs() -> dict:
    return {
        'terminos': {
            'label': 'Términos',
            'title': 'Términos de uso',
            'updated': UPDATED_ES,
            'blocks': [
                {
                    'type': 'p',
                    'text': 'Estos términos regulan el uso de FoodSaaS, software de gestión para restaurantes operado desde el Perú. Al crear una cuenta o iniciar sesión, el restaurante (el “Cliente”) acepta estas condiciones.',
                },
                {
                    'type': 'p',
                    'text': 'FoodSaaS es una herramienta tecnológica. No sustituye asesoría legal, contable o tributaria. El Cliente es responsable de la veracidad de la información que registra y del uso que haga del sistema.',
                },
                {
                    'type': 'p',
                    'text': 'La cuenta es de uso interno del restaurante y de su personal autorizado. Queda prohibido compartir credenciales, intentar acceder a datos de otros restaurantes o usar el servicio para fines ilícitos.',
                },
                {
                    'type': 'p',
                    'text': 'Los datos operativos, de clientes y de ventas que se cargan en el tenant pertenecen al restaurante. FoodSaaS no los comercializa ni los usa como producto de reventa. El acceso de soporte, cuando exista, se limita a lo necesario para resolver un incidente y queda registrado.',
                },
                {
                    'type': 'p',
                    'text': 'Podemos suspender el acceso ante incumplimiento, riesgo de seguridad o falta de pago, con el aviso razonable que permita el caso. El Cliente puede solicitar la baja y la exportación de su información según el plan contratado.',
                },
            ],
        },
        'privacidad': {
            'label': 'Privacidad',
            'title': 'Política de privacidad',
            'updated': UPDATED_ES,
            'blocks': [
                {
                    'type': 'p',
                    'text': 'Esta política describe cómo se tratan los datos personales en FoodSaaS, en línea con la Ley N.° 29733, Ley de Protección de Datos Personales, su Reglamento vigente y las directrices de la Autoridad Nacional de Protección de Datos Personales (ANPDP) del Ministerio de Justicia y Derechos Humanos del Perú.',
                },
                {
                    'type': 'p',
                    'text': 'Hay dos ámbitos distintos. (1) Datos de la cuenta del restaurante y de sus usuarios (correo, nombre, rol): el responsable del tratamiento es el operador de FoodSaaS. (2) Datos de clientes, pedidos, caja e inventario: el titular del banco de datos y responsable es el restaurante. FoodSaaS actúa como encargado del tratamiento, solo para prestar el servicio y siguiendo las instrucciones del Cliente.',
                },
                {
                    'type': 'p',
                    'text': 'Los datos de pedidos, clientes, facturación interna y comunicaciones operativas se almacenan de forma segregada por restaurante (tenant). No se mezclan con otros restaurantes ni se publican. Son de uso interno de ese establecimiento, salvo obligación legal o requerimiento de autoridad competente.',
                },
                {
                    'type': 'p',
                    'text': 'No vendemos bases de datos. No usamos la información operativa para publicidad de terceros. El tratamiento se limita a operar el software, seguridad, soporte técnico, facturación del servicio SaaS y cumplimiento normativo.',
                },
                {
                    'type': 'p',
                    'text': 'Si un cliente o usuario ejerce sus derechos, puede dirigirse primero al restaurante (respecto de su ficha) o a soporte@foodsaas.orvae.pe (respecto de la cuenta de acceso a la plataforma). Atenderemos o reenviaremos la solicitud según corresponda al rol de responsable o encargado.',
                },
            ],
        },
        'datos': {
            'label': 'Datos personales',
            'title': 'Protección de datos personales (Perú)',
            'updated': UPDATED_ES,
            'blocks': [
                {
                    'type': 'p',
                    'text': 'En el Perú, el tratamiento de datos personales se rige principalmente por la Ley N.° 29733 y su reglamento. Los datos de clientes y los vinculados a la operación del restaurante se tratan con finalidad determinada: la gestión autorizada por el Cliente.',
                },
                {
                    'type': 'p',
                    'text': 'Principios que aplicamos: legalidad, consentimiento cuando corresponda, finalidad, proporcionalidad, calidad, seguridad y disposición de recurso. No se recaban datos ajenos al servicio. El consentimiento para el banco de datos del restaurante lo recaba el establecimiento en su relación con el cliente; FoodSaaS no sustituye ese deber.',
                },
                {
                    'type': 'p',
                    'text': 'Derechos ARCO y complementarios (acceso, rectificación, cancelación, oposición, y los que reconozca la normativa vigente, como revocación e información): el titular puede ejercerlos ante el responsable. El restaurante debe habilitar un canal; FoodSaaS colaborará técnicamente (corrección, bloqueo o supresión en el sistema, cuando proceda y no exista deber de conservación).',
                },
                {
                    'type': 'ul',
                    'items': [
                        'Finalidad interna: mesas, comandas, inventario, caja y comunicaciones operativas de ese restaurante.',
                        'No hay cesión a terceros con fines comerciales.',
                        'Encargados técnicos (hosting, correo, mensajería) solo procesan lo necesario, con medidas de confidencialidad.',
                        'Conservación: mientras el restaurante mantenga la cuenta y los plazos legales o contables que deba cumplir.',
                        'Transferencia: los servidores se eligen con criterios de seguridad; si hubiera flujo transfronterizo, se aplicarán las salvaguardas que exija la Ley 29733.',
                    ],
                },
                {
                    'type': 'p',
                    'text': 'La ANPDP es la autoridad administrativa en materia de protección de datos personales en el Perú. El titular puede interponer reclamo ante dicha autoridad si considera vulnerados sus derechos, sin perjuicio de la vía judicial.',
                },
            ],
        },
        'cookies': {
            'label': 'Cookies',
            'title': 'Cookies y sesión',
            'updated': UPDATED_ES,
            'blocks': [
                {
                    'type': 'p',
                    'text': 'Usamos cookies y almacenamiento local estrictamente necesarios para iniciar sesión, mantener la sesión, recordar preferencias (idioma, tema) y proteger el servicio (por ejemplo, tokens CSRF y detección de abuso).',
                },
                {
                    'type': 'p',
                    'text': 'No instalamos cookies de publicidad de terceros ni perfiles de marketing sobre datos operativos. Si en el futuro se añadiera una cookie no esencial, se solicitará el consentimiento cuando la norma lo exija.',
                },
                {
                    'type': 'p',
                    'text': 'Puede bloquear cookies en el navegador; algunas funciones de login o sesión dejarían de operar. El “mantener sesión iniciada” solo prolonga su acceso al restaurante, no comparte datos con redes publicitarias.',
                },
            ],
        },
        'seguridad': {
            'label': 'Seguridad',
            'title': 'Seguridad y confidencialidad',
            'updated': UPDATED_ES,
            'blocks': [
                {
                    'type': 'p',
                    'text': 'Los datos se tratan como información interna y confidencial de cada restaurante. Aplicamos medidas organizativas y técnicas razonables: separación por tenant, cifrado en tránsito (HTTPS), control de accesos por rol, registro de operaciones sensibles y copias de respaldo.',
                },
                {
                    'type': 'p',
                    'text': 'Ningún sistema es invulnerable. El Cliente debe usar contraseñas robustas, no compartir usuarios y cerrar sesión en equipos compartidos. El personal del restaurante solo debe acceder a lo que su rol permita.',
                },
                {
                    'type': 'p',
                    'text': 'Los incidentes de seguridad que afecten datos personales se gestionarán conforme a la normativa peruana aplicable, incluyendo la comunicación a la autoridad y a los titulares cuando corresponda.',
                },
                {
                    'type': 'p',
                    'text': 'El soporte de FoodSaaS no usa los datos operativos para entrenar modelos de IA de terceros ni para fines ajenos a la incidencia. Cualquier asistencia humana o automatizada sobre el tenant queda sujeta a este deber de reserva.',
                },
            ],
        },
        'soporte': {
            'label': 'Soporte',
            'title': 'Soporte',
            'updated': UPDATED_ES,
            'blocks': [
                {
                    'type': 'p',
                    'text': 'Para ayuda de la plataforma, escriba a soporte@foodsaas.orvae.pe indicando el nombre del restaurante y, si es posible, el usuario afectado. No envíe por correo innecesario datos de clientes o comprobantes completos que no hagan falta para el ticket.',
                },
                {
                    'type': 'p',
                    'text': 'El canal de soporte existe para operar el software (accesos, planes, fallos técnicos). No es un buzón para datos de clientes de otros restaurantes.',
                },
                {
                    'type': 'p',
                    'text': 'Las solicitudes ARCO u otras sobre datos personales pueden enviarse al mismo correo, con asunto “Protección de datos”, para derivarlas al responsable correcto (restaurante u operador de la plataforma).',
                },
            ],
        },
    }


def en_docs() -> dict:
    return {
        'terminos': {
            'label': 'Terms',
            'title': 'Terms of use',
            'updated': UPDATED_EN,
            'blocks': [
                {
                    'type': 'p',
                    'text': 'These terms govern the use of FoodSaaS, restaurant management software operated from Peru. By creating an account or signing in, the restaurant (the “Client”) accepts these conditions.',
                },
                {
                    'type': 'p',
                    'text': 'FoodSaaS is a technology tool. It does not replace legal, accounting, or tax advice. The Client is responsible for the accuracy of the information entered and for how the system is used.',
                },
                {
                    'type': 'p',
                    'text': 'The account is for internal use by the restaurant and its authorized staff. Sharing credentials, accessing other restaurants’ data, or using the service for unlawful purposes is prohibited.',
                },
                {
                    'type': 'p',
                    'text': 'Operational, customer, and sales data loaded into the tenant belongs to the restaurant. FoodSaaS does not sell or repurpose it. Support access, when provided, is limited to what is needed to resolve an incident and is logged.',
                },
                {
                    'type': 'p',
                    'text': 'We may suspend access for breach, security risk, or non-payment, with reasonable notice when possible. The Client may request cancellation and export of their information according to their plan.',
                },
            ],
        },
        'privacidad': {
            'label': 'Privacy',
            'title': 'Privacy policy',
            'updated': UPDATED_EN,
            'blocks': [
                {
                    'type': 'p',
                    'text': 'This policy describes how personal data is handled in FoodSaaS, in line with Peru’s Law No. 29733, its regulations, and guidelines from the National Authority for Personal Data Protection (ANPDP).',
                },
                {
                    'type': 'p',
                    'text': 'There are two scopes. (1) Restaurant account and user data (email, name, role): FoodSaaS’s operator is the controller. (2) Customer, order, cash register, and inventory data: the restaurant is the controller. FoodSaaS acts as processor only to provide the service and follow the Client’s instructions.',
                },
                {
                    'type': 'p',
                    'text': 'Order, customer, billing, and operational communication data is stored separately per restaurant (tenant). It is not mixed with other restaurants or published. It is for internal use of that establishment, except where law or authority requires otherwise.',
                },
                {
                    'type': 'p',
                    'text': 'We do not sell databases. We do not use operational information for third-party advertising. Processing is limited to running the software, security, technical support, SaaS billing, and regulatory compliance.',
                },
                {
                    'type': 'p',
                    'text': 'If a customer or user exercises their rights, they may contact the restaurant first (for their record) or soporte@foodsaas.orvae.pe (for platform access). We will handle or forward the request according to the controller/processor role.',
                },
            ],
        },
        'datos': {
            'label': 'Personal data',
            'title': 'Personal data protection (Peru)',
            'updated': UPDATED_EN,
            'blocks': [
                {
                    'type': 'p',
                    'text': 'In Peru, personal data processing is mainly governed by Law No. 29733 and its regulations. Customer and restaurant-operation data is processed for a defined purpose: management authorized by the Client.',
                },
                {
                    'type': 'p',
                    'text': 'Principles we apply: lawfulness, consent where required, purpose, proportionality, quality, security, and available remedies. We do not collect data unrelated to the service. Consent for the restaurant’s database is obtained by the establishment in its relationship with the customer; FoodSaaS does not replace that duty.',
                },
                {
                    'type': 'p',
                    'text': 'ARCO and related rights (access, rectification, cancellation, objection, and others under applicable law): the data subject may exercise them with the controller. The restaurant must provide a channel; FoodSaaS will assist technically (correction, blocking, or deletion in the system when appropriate and not prevented by retention duties).',
                },
                {
                    'type': 'ul',
                    'items': [
                        'Internal purpose: tables, orders, inventory, cash register, and operational communications for that restaurant.',
                        'No transfer to third parties for commercial purposes.',
                        'Technical processors (hosting, email, messaging) only process what is necessary, with confidentiality measures.',
                        'Retention: while the restaurant keeps the account and for legal or accounting periods it must observe.',
                        'Transfer: servers are chosen with security criteria; cross-border flows will use safeguards required by Law No. 29733.',
                    ],
                },
                {
                    'type': 'p',
                    'text': 'ANPDP is Peru’s administrative authority for personal data protection. Data subjects may file a complaint there if they believe their rights were violated, without prejudice to court action.',
                },
            ],
        },
        'cookies': {
            'label': 'Cookies',
            'title': 'Cookies and session',
            'updated': UPDATED_EN,
            'blocks': [
                {
                    'type': 'p',
                    'text': 'We use cookies and local storage strictly necessary to sign in, maintain the session, remember preferences (language, theme), and protect the service (for example CSRF tokens and abuse detection).',
                },
                {
                    'type': 'p',
                    'text': 'We do not install third-party advertising cookies or marketing profiles on operational data. If a non-essential cookie were added in the future, consent would be requested when the law requires it.',
                },
                {
                    'type': 'p',
                    'text': 'You may block cookies in the browser; some login or session features would stop working. “Keep me signed in” only extends access to the restaurant; it does not share data with ad networks.',
                },
            ],
        },
        'seguridad': {
            'label': 'Security',
            'title': 'Security and confidentiality',
            'updated': UPDATED_EN,
            'blocks': [
                {
                    'type': 'p',
                    'text': 'Data is treated as internal, confidential information for each restaurant. We apply reasonable organizational and technical measures: tenant separation, encryption in transit (HTTPS), role-based access, logging of sensitive operations, and backups.',
                },
                {
                    'type': 'p',
                    'text': 'No system is invulnerable. The Client must use strong passwords, not share users, and sign out on shared devices. Restaurant staff should only access what their role allows.',
                },
                {
                    'type': 'p',
                    'text': 'Security incidents affecting personal data will be handled under applicable Peruvian law, including notification to the authority and data subjects when required.',
                },
                {
                    'type': 'p',
                    'text': 'FoodSaaS support does not use operational data to train third-party AI models or for purposes unrelated to the incident. Any human or automated assistance on the tenant is subject to this duty of confidentiality.',
                },
            ],
        },
        'soporte': {
            'label': 'Support',
            'title': 'Support',
            'updated': UPDATED_EN,
            'blocks': [
                {
                    'type': 'p',
                    'text': 'For platform help, email soporte@foodsaas.orvae.pe with the restaurant name and, if possible, the affected user. Do not send unnecessary customer data or full receipts by email.',
                },
                {
                    'type': 'p',
                    'text': 'Support is for operating the software (access, plans, technical issues). It is not a mailbox for other restaurants’ customer data.',
                },
                {
                    'type': 'p',
                    'text': 'ARCO or other personal-data requests may be sent to the same address with subject “Data protection”, to route them to the correct controller (restaurant or platform operator).',
                },
            ],
        },
    }


def shell(locale: str, docs: dict) -> dict:
    if locale == 'es':
        footer = {
            'made_in': 'Hecho en Perú',
            'platform': 'Plataforma Orvae · FoodSaaS',
            'terms': 'Términos',
            'privacy': 'Privacidad',
            'data': 'Datos',
            'cookies': 'Cookies',
            'security': 'Seguridad',
            'support': 'Soporte',
        }
        modal = {
            'meta': 'FoodSaaS · Perú · Actualizado el {{date}}',
            'nav_label': 'Documentos legales',
            'disclaimer': 'Este texto informa el uso del servicio y el marco de la Ley 29733. No reemplaza asesoría legal personalizada ni el registro de bancos de datos que el restaurante deba cumplir ante la ANPDP.',
        }
    else:
        footer = {
            'made_in': 'Made in Peru',
            'platform': 'Orvae Platform · FoodSaaS',
            'terms': 'Terms',
            'privacy': 'Privacy',
            'data': 'Data',
            'cookies': 'Cookies',
            'security': 'Security',
            'support': 'Support',
        }
        modal = {
            'meta': 'FoodSaaS · Peru · Updated {{date}}',
            'nav_label': 'Legal documents',
            'disclaimer': 'This text describes use of the service and Peru’s Law No. 29733 framework. It does not replace personalized legal advice or database registrations the restaurant must file with ANPDP.',
        }
    return {'footer': footer, 'modal': modal, 'docs': docs}


def main() -> None:
    for locale, docs in (('es', es_docs()), ('en', en_docs())):
        path = ROOT / 'resources' / 'js' / 'lang' / locale / 'legal.json'
        path.write_text(
            json.dumps(shell(locale, docs), ensure_ascii=False, indent=2) + '\n',
            encoding='utf-8',
        )
        print(f'Wrote {path}')


if __name__ == '__main__':
    main()
