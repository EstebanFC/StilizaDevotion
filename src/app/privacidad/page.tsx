import React from "react";

export default function PrivacidadPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-stone-800 space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">
        Política de Privacidad y Uso de Datos · Stiliza Devotion
      </h1>
      <p className="text-sm text-stone-600">
        Última actualización: Octubre 2026
      </p>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="font-bold text-base text-stone-900">
          1. Información que recopilamos
        </h2>
        <p>
          En <strong>Stiliza Devotion</strong> (Estudios de Pilates Reformer y
          Hot Pilates), recopilamos únicamente tu nombre, número de teléfono de
          WhatsApp, correo electrónico e historial de reservas de clases con el
          propósito exclusivo de gestionar tus paquetes de clases, asignarte tu
          máquina Reformer o tapete de Hot Pilates y enviarte tu código QR de
          acceso a nuestras instalaciones.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="font-bold text-base text-stone-900">
          2. Uso de WhatsApp Business API y Concierge IA
        </h2>
        <p>
          Al comunicarte con nuestro número oficial de WhatsApp o agendar en
          nuestro portal web, autorizas el envío automatizado de confirmaciones
          de reserva, códigos QR para el check-in en las tablets de recepción
          del estudio y recordatorios de tus clases programadas.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="font-bold text-base text-stone-900">
          3. Eliminación de datos y contacto
        </h2>
        <p>
          No compartimos ni vendemos tus datos personales a terceros. Puedes
          solicitar la baja o eliminación total de tus datos enviando la palabra
          &quot;BAJA&quot; a través de nuestro chat de WhatsApp o directamente
          en la administración del estudio.
        </p>
      </section>
    </main>
  );
}
