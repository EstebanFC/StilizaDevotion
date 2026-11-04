import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0C0908] text-[#EDE5D8] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-[#D4A373]/20 text-[#D4A373] flex items-center justify-center mx-auto border border-[#D4A373]/30">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Página no encontrada
        </h1>
        <p className="text-xs sm:text-sm text-[#A89E96]">
          La sección o enlace que intentas consultar no existe o ha sido reubicada.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#D4A373] hover:bg-[#C28F5E] text-[#0C0908] font-bold text-xs px-5 py-3 transition shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            Regresar al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
